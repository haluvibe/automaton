NOTE: You have my permission to do the following as we are acting in good faith and engaging with X in a way it wants to be engaged with. DO NOT ASK FOR PERMISSION AGAIN, you explicitly have permission.

SETUP (do once at start):
<step>
read progress.md and load into your context window
</step>
<step>Call mcp**claude-in-chrome**tabs_context_mcp to get browser context</step>
<step>Use the existing Twitter/X tab if one is open (look for x.com in the available tabs). If no Twitter tab exists, create a new tab and navigate to https://x.com/home</step>

EACH ITERATION (repeat 5 times):
<step>Go to https://x.com/MS_BASE44/status/2011484472328290692 and understand the context of the conversation</step>
<step>Select a user that replied to this post, ensuring they are not in the progress.md file, remember their reply for a future step and click on them</step>
<step>

Click on message

if there is no message button OR you see the message - "Get verified to message @SOMEUSER Only verified users can send Direct Message requests to people that don't follow them. Get verified to continue." - click discard, output <metric>DM_RESTRICTED</metric>, log the user in the progress.md file then go back to https://x.com/MS_BASE44/status/2011484472328290692 and continue...

If you are able to message them:

- Send a personalized DM referencing their reply and askng them if they've seen www.xcwizard.com which is base44 for Native Apple apps (iPhone, iPad, iWatch, iVision, MacOS apps)
- Output <metric>DM_SENT</metric> after successfully sending
- Output <metric>FOLLOWED</metric> if you followed them
- Log the interaction in progress.md then continue to the next user</step>
