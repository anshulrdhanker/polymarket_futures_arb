# Technical Flow: Frontend to Backend

## 1. User Action (Frontend)

User types in the "To" field and hits Send.

Frontend fires a POST request to `/api/search/prospects` with:

```json
{
  "toField": "...",
  "bodyField": "...",  // optional
  "outreachType": "recruiting"
}
```

## 2. Backend Route Handling

**File:** `routes/search.ts`  
**Route:** `POST /api/search/prospects`

The route handler:

1. Parses and validates the input
2. Uses `OpenAIService.parseNaturalLanguageToConversationData()` to convert user input into structured `conversationData`
3. Creates a campaign in the database using the `Campaign` model
4. Calls `QueueService.startCampaignProcessing()` to enqueue the campaign job to BullMQ
5. Returns:

```json
{
  "campaignId": "campaign-uuid-here",
  "status": "processing",
  "message": "Search is being processed. Poll /api/campaigns/:id for results."
}
```

## 3. Background Worker

In a separate worker file (`jobs/campaignProcessor.ts`), a campaign-processing worker listens for jobs.

It performs the following steps:

1. Pulls `campaignId`, `userId`, and `conversationData` from the job
2. Uses `PDLService.searchFromConversation()` to fetch prospects based on the conversation data
3. Saves the prospects to the database
4. Passes the batch to the email generation queue for further processing
5. Updates the campaign status accordingly

This asynchronous flow allows the system to handle potentially long-running operations without blocking the main request/response cycle, providing a better user experience.
