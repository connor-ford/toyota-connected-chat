"""
Lambda: Lex proxy
Receives { message, sessionId } from API Gateway.
Calls Lex V2, returns { message, escalate }.

Environment variables required:
  LEX_BOT_ID        - your Lex V2 bot ID
  LEX_BOT_ALIAS_ID  - your Lex V2 bot alias ID
  LEX_LOCALE_ID     - e.g. en_US (defaults to en_US)
"""

import json
import os
import boto3

client = boto3.client("lexv2-runtime", region_name=os.environ["AWS_REGION"])

ESCALATION_INTENTS = {"ReportEmergency", "EscalateToAgent", "LiveAgent"}

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
}


def lambda_handler(event, context):
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    # Parse body
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": HEADERS,
            "body": json.dumps({"error": "Invalid JSON"}),
        }

    message    = body.get("message")
    session_id = body.get("sessionId")

    if not message or not session_id:
        return {
            "statusCode": 400,
            "headers": HEADERS,
            "body": json.dumps({"error": "message and sessionId are required"}),
        }

    try:
        response = client.recognize_text(
            botId=os.environ["LEX_BOT_ID"],
            botAliasId=os.environ["LEX_BOT_ALIAS_ID"],
            localeId=os.environ.get("LEX_LOCALE_ID", "en_US"),
            sessionId=session_id,
            text=message,
        )

        # Extract first message from Lex
        messages = response.get("messages", [])
        lex_message = (
            messages[0]["content"]
            if messages
            else "I'm sorry, I didn't understand that. Could you rephrase?"
        )

        # Check for escalation intent
        intent_name = (
            response.get("sessionState", {})
            .get("intent", {})
            .get("name", "")
        )
        escalate = intent_name in ESCALATION_INTENTS

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({
                "message": lex_message,
                "escalate": escalate,
                "intentName": intent_name,
            }),
        }

    except Exception as e:
        print(f"Lex error: {e}")
        return {
            "statusCode": 502,
            "headers": HEADERS,
            "body": json.dumps({"error": "Upstream Lex error", "detail": str(e)}),
        }
