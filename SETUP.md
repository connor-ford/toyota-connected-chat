# Toyota Connected Chat — Setup Tutorial

Complete these steps in order. Every AWS console step is numbered.
Estimated time: 4–6 hours.

---

## PART 1 — Amazon Lex V2 bot

### 1.1 Create the bot

1. Open the AWS console → search **Lex** → click **Amazon Lex**.
2. Click **Create bot**.
3. Select **Create a blank bot**.
4. Bot name: `ToyotaConnectedBot`
5. IAM permissions: select **Create a role with basic Amazon Lex permissions**.
6. COPPA: select **No**.
7. Idle session timeout: `5 minutes`.
8. Click **Next**.
9. Language: **English (US)**, Voice: any (we're text-only), click **Done**.

### 1.2 Create intents

You need four intents. For each one: click **Add intent → Add empty intent**, name it, add utterances, save.

**Intent 1: FindServiceCenter**
Utterances (add all of these):
- `find a service centre`
- `where can I get my car serviced`
- `nearest Toyota dealer`
- `service centre near me`
- `I need a service`

Add one slot:
- Slot name: `Location`
- Slot type: `AMAZON.City`
- Prompt: `What city or suburb are you in?`

Response: `I'm finding service centres near {Location}. The closest Toyota dealer is [DEMO: insert address here]. Shall I send directions to your vehicle?`

**Intent 2: GetVehicleManual**
Utterances:
- `get my vehicle manual`
- `I need my owner's manual`
- `send me the manual`
- `vehicle manual`
- `how do I find my manual`

Response: `I'll send a link to your vehicle manual now. You can also find it at toyota.com/owners. Is there anything else I can help with?`

**Intent 3: ReportEmergency**
Utterances:
- `I need roadside assistance`
- `I've broken down`
- `my car won't start`
- `I've had an accident`
- `emergency`
- `help me`
- `I need an agent`
- `connect me to someone`
- `talk to a person`
- `live agent`

Response: `I'm connecting you to a Toyota roadside assistance agent right away. Please stay on the line.`

> **Important**: This intent triggers escalation to Connect. The intent name must stay exactly `ReportEmergency` — this is what the Lex Lambda checks.

**Intent 4: FallbackIntent** (already exists by default)
Edit the response to: `I didn't quite catch that. I can help you find a service centre, get your vehicle manual, or connect you with a roadside assistance agent.`

### 1.3 Build and deploy the bot

1. Click **Build** (top right). Wait for it to complete (~30 seconds).
2. Click **Publish**.
3. Alias name: `prod`
4. Click **Publish**.
5. Note down:
   - **Bot ID** (shown in the bot list — looks like `ABCDE12345`)
   - **Bot alias ID** (shown after publishing — looks like `TSTALIASID` for test or a random ID for prod)

---

## PART 2 — Amazon Connect instance

### 2.1 Create the instance

1. AWS console → search **Connect** → click **Amazon Connect**.
2. Click **Add an instance**.
3. Identity management: **Store users within Amazon Connect**.
4. Access URL: choose a unique name e.g. `toyota-connected-demo` → click **Next**.
5. Admin account: create an admin username and password → **Next**.
6. Telephony: leave defaults → **Next**.
7. Data storage: leave defaults → **Next**.
8. Review → **Create instance**.
9. Wait 2–3 minutes. Note your **Instance ID** from the instance ARN:
   `arn:aws:connect:REGION:ACCOUNT:instance/INSTANCE-ID`

### 2.2 Create a chat contact flow

1. Click **Log in for emergency access** to open the Connect admin console.
2. Left sidebar → **Routing → Contact flows**.
3. Click **Create contact flow**.
4. Name it: `Toyota Chat Flow`.
5. Drag in a **Set working queue** block → select `BasicQueue` → connect it to Start.
6. Drag in a **Transfer to queue** block → connect it after Set working queue.
7. Connect **Transfer to queue** success/error outputs to **Disconnect**.
8. Click **Save** → **Publish**.
9. Note the **Contact Flow ID** from the URL:
   `.../contact-flow/CONTACT-FLOW-ID`

### 2.3 Enable chat in your instance

1. In the Connect console → **Overview** → **Enable chat**.
2. Under **Approved origins**, click **Add origin**.
3. Add: `https://YOUR-GITHUB-USERNAME.github.io`
4. Save.

---

## PART 3 — Lambda functions

### 3.1 Deploy the Lex Lambda

1. AWS console → **Lambda** → **Create function**.
2. **Author from scratch**.
3. Function name: `toyota-lex-proxy`
4. Runtime: **Node.js 20.x**
5. Click **Create function**.
6. In the **Code** tab, delete the default code.
7. Open `lambda-lex/index.js` from this project, copy all contents, paste into the editor.
8. Click **Deploy**.

Set environment variables (Configuration → Environment variables → Edit):
| Key | Value |
|-----|-------|
| `LEX_BOT_ID` | your Bot ID from Part 1 |
| `LEX_BOT_ALIAS_ID` | your Bot alias ID from Part 1 |
| `LEX_LOCALE_ID` | `en_US` |

Set IAM permissions (Configuration → Permissions → click the role name):
1. Click **Add permissions → Attach policies**.
2. Search for and attach: `AmazonLexRunBotsOnly`
3. Save.

### 3.2 Deploy the Connect Lambda

1. **Lambda** → **Create function** → **Author from scratch**.
2. Function name: `toyota-connect-proxy`
3. Runtime: **Node.js 20.x**
4. Click **Create function**.
5. Paste the contents of `lambda-connect/index.js`.
6. Click **Deploy**.

Set environment variables:
| Key | Value |
|-----|-------|
| `CONNECT_INSTANCE_ID` | your Connect instance ID from Part 2 |
| `CONNECT_CONTACT_FLOW_ID` | your contact flow ID from Part 2 |

Set IAM permissions — attach these two policies to the Lambda execution role:
- `AmazonConnectFullAccess` (or create a custom policy with `connect:StartChatContact` and `connectparticipant:*`)

---

## PART 4 — API Gateway

### 4.1 Create the Lex API

1. AWS console → **API Gateway** → **Create API**.
2. Choose **REST API** → **Build**.
3. API name: `toyota-lex-api` → **Create API**.
4. Actions → **Create Resource** → Resource name: `chat` → **Create Resource**.
5. With `/chat` selected → Actions → **Create Method** → **POST** → tick.
6. Integration type: **Lambda Function** → enter `toyota-lex-proxy` → **Save** → **OK**.
7. With `/chat` selected → Actions → **Enable CORS**:
   - Access-Control-Allow-Origin: `'https://YOUR-GITHUB-USERNAME.github.io'`
   - Click **Enable CORS and replace existing CORS headers** → **Yes**.
8. Actions → **Deploy API**:
   - Stage: **[New Stage]** → Stage name: `prod` → **Deploy**.
9. Note the **Invoke URL** (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/prod`).
   Your `REACT_APP_LEX_API_URL` = this URL + `/chat`.

### 4.2 Add an API key

1. In API Gateway left sidebar → **API Keys** → **Create API key**.
2. Name: `toyota-chat-key` → **Save**.
3. **Usage Plans** → **Create**.
4. Name: `toyota-plan`, set throttling/quota as desired → **Next**.
5. Add your `toyota-lex-api` prod stage → **Next**.
6. Add the `toyota-chat-key` key → **Done**.
7. Go back to API Keys → `toyota-chat-key` → **Show** next to API key. Note this value.

### 4.3 Create the Connect API

Repeat steps 4.1 and 4.2 for the Connect Lambda:
1. API name: `toyota-connect-api`
2. Create two resources:
   - `/escalate` → POST → `toyota-connect-proxy`
   - `/escalate/message` → POST → `toyota-connect-proxy`
3. Enable CORS on both resources.
4. Deploy to `prod` stage.
5. Your `REACT_APP_CONNECT_API_URL` = Invoke URL + `/escalate`.
6. Attach the same usage plan and API key to this API.

---

## PART 5 — GitHub repository and secrets

### 5.1 Create the repository

1. Go to github.com → **New repository**.
2. Name: `toyota-connected-chat`
3. Visibility: **Public** (required for free GitHub Pages).
4. Do not initialise with README.
5. Click **Create repository**.

### 5.2 Push the code

Run these commands in your terminal from inside the `toyota-chat` folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/toyota-connected-chat.git
git push -u origin main
```

### 5.3 Add secrets to GitHub

1. On your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** for each of these:

| Name | Value |
|------|-------|
| `REACT_APP_LEX_API_URL` | your Lex API Gateway URL + `/chat` |
| `REACT_APP_CONNECT_API_URL` | your Connect API Gateway URL + `/escalate` |
| `REACT_APP_API_KEY` | your API Gateway key value |
| `REACT_APP_AWS_REGION` | e.g. `us-east-1` |

### 5.4 Enable GitHub Pages

1. Repo → **Settings** → **Pages**.
2. Source: **Deploy from a branch**.
3. Branch: **gh-pages** → **/(root)** → **Save**.

The first deploy runs automatically when you push to main. After ~2 minutes your site is live at:
`https://YOUR-USERNAME.github.io/toyota-connected-chat`

---

## PART 6 — Test the full flow

1. Open your GitHub Pages URL.
2. Click **Find a service centre near me** — Lex should respond with the service centre message.
3. Type `I need roadside assistance` — Lex should respond and the React app should trigger Connect escalation.
4. The status bar should change to **Agent connected**.

If anything fails, check **CloudWatch Logs** for the relevant Lambda function — the error will tell you exactly what went wrong.

---

## Common issues

**CORS error in browser console**
API Gateway CORS is misconfigured. Go back to Part 4 step 7 and re-deploy after enabling CORS. Make sure the exact GitHub Pages URL is in the allowed origin, with no trailing slash.

**403 from API Gateway**
API key is missing or the usage plan is not attached to the stage. Re-check Part 4.2.

**Lex returns no message**
The bot alias is not published. Go back to Part 1.3 and re-publish.

**Connect escalation fails**
The Lambda execution role is missing `connect:StartChatContact`. Check Part 3.2 IAM permissions.
