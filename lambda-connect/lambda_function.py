"""
Lambda: Connect escalation + message proxy
Routes:
  POST /escalate         - starts a new Connect chat contact
  POST /escalate/message - sends a message to an existing Connect chat

Environment variables required:
  CONNECT_INSTANCE_ID     - your Connect instance ID (GUID)
  CONNECT_CONTACT_FLOW_ID - contact flow ID to route chat to
"""

import json
import os
import boto3

connect     = boto3.client("connect",            region_name=os.environ["AWS_REGION"])
participant = boto3.client("connectparticipant", region_name=os.environ["AWS_REGION"])

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
}


def start_chat(session_id):
    response = connect.start_chat_contact(
        InstanceId=os.environ["CONNECT_INSTANCE_ID"],
        ContactFlowId=os.environ["CONNECT_CONTACT_FLOW_ID"],
        ParticipantDetails={"DisplayName": f"Driver-{session_id[:8]}"},
        ChatDurationInMinutes=60,
        SupportedMessagingContentTypes=["text/plain"],
    )

    token = response["ParticipantToken"]

    conn = participant.create_participant_connection(
        ParticipantToken=token,
        Type=["WEBSOCKET", "CONNECTION_CREDENTIALS"],
    )

    return {
        "connectionToken": conn["ConnectionCredentials"]["ConnectionToken"],
        "websocketUrl":    conn["Websocket"]["Url"],
        "expiry":          conn["ConnectionCredentials"]["Expiry"],
    }


def send_message(connection_token, message):
    participant.send_message(
        ConnectionToken=connection_token,
        ContentType="text/plain",
        Content=message,
    )


def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": HEADERS,
            "body": json.dumps({"error": "Invalid JSON"}),
        }

    path = event.get("path") or event.get("rawPath") or ""

    try:
        if path.endswith("/message"):
            message          = body.get("message")
            connection_token = body.get("connectionToken")

            if not message or not connection_token:
                return {
                    "statusCode": 400,
                    "headers": HEADERS,
                    "body": json.dumps({"error": "message and connectionToken are required"}),
                }

            send_message(connection_token, message)
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

        else:
            session_id = body.get("sessionId")

            if not session_id:
                return {
                    "statusCode": 400,
                    "headers": HEADERS,
                    "body": json.dumps({"error": "sessionId is required"}),
                }

            result = start_chat(session_id)
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps(result)}

    except Exception as e:
        print(f"Connect error: {e}")
        return {
            "statusCode": 502,
            "headers": HEADERS,
            "body": json.dumps({"error": "Connect error", "detail": str(e)}),
        }
