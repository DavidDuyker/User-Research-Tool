# Case management task system product testing

**Session type:** Moderated product test (prototype)  
**Duration:** ~20 minutes  
**Date:** 2026-07-28  
**Interviewer:** Maya Chen  
**Participant:** Jordan Hale (Case Manager, Mid-size nonprofit — housing services)  
**Prototype:** Web case management task system — inbox, case detail, task assignment, due dates, notes

---

## Transcript

**Interviewer:** Thanks for joining, Jordan. Before we start the prototype, can you briefly describe how you manage tasks on cases today?

**Participant:** Sure. Most of my day is chasing follow-ups. We use a shared spreadsheet for open cases, and then email and sticky notes for the actual tasks. I’ll open a case in our old CRM, see a note from last week, and then invent the next step myself. Nothing really tells me what’s overdue unless I remember.

**Interviewer:** About how many open cases do you juggle at once?

**Participant:** Depends on the week. Usually thirty to forty active. Not all need something every day, but maybe eight to ten have something due that I’m supposed to do—call a landlord, upload a form, check with benefits. Those are the ones that slip.

**Interviewer:** Got it. I’m going to share a prototype of a task system built around cases. Think aloud as you go—what you’re looking for, what confuses you, what you’d expect next. There’s no right answer. Ready?

**Participant:** Ready.

**Interviewer:** First screen is your task inbox. What do you notice?

**Participant:** Okay… it’s a list. Looks like tasks, not cases. That’s interesting. I usually think in cases first. But I like that I can see due dates. Red ones are overdue? Yeah, that makes sense. “Call landlord — Unit 4B” — I’d want the client name more prominent than the unit.

**Interviewer:** Click into that task if you’d like.

**Participant:** Alright. Opens a side panel… oh, it opens the case on the right. That’s better. I can see the household, last contact, and this task. Status is “Open.” I’d want to mark it done or reschedule without leaving. Where’s… okay, “Complete” and “Snooze.” Snooze is good. We reschedule constantly.

**Interviewer:** What would you do next after calling the landlord?

**Participant:** I’d complete this, then usually create a follow-up—like “Confirm lease signed” for next week. Is there an add task from here? …Ah, “Add related task.” Nice. It’s asking for title, due date, assignee. Default assignee is me. Can I assign to my coworker Priya?

**Interviewer:** Try it.

**Participant:** Dropdown… yes, Priya’s there. I’d also want to leave a note about what the landlord said, not just close the task. Is notes on the case or on the task? I’m clicking around… Notes tab on the case. Okay, so task complete is separate from documenting. That matches how we work, but people will forget the note if it’s two places.

**Interviewer:** How big of a problem is that?

**Participant:** Medium-big. If I complete without a note, my supervisor has no audit trail for the funder. We get dinged for that. So maybe a prompt—“Add a note before completing?”—would help, even if it’s skippable.

**Interviewer:** Noted. Let’s go back to the inbox. Filter or sort however you’d normally start your morning.

**Participant:** I’d sort by due date, oldest first… yes. And filter to just mine. Where’s filter… “Assigned to: Me.” Good. There’s also “Team.” I don’t usually want the whole team at 8am—I’d drown. Maybe later when covering for someone.

**Interviewer:** How does this compare to your spreadsheet?

**Participant:** Spreadsheet shows cases in rows. This shows work items. Honestly for mornings, work items are better. For afternoon case reviews with a client, I’d still want a case view first. Can I get there without a task?

**Interviewer:** Try the left nav—Cases.

**Participant:** Cases… search by name. Type “Rivera”… found them. Case page has timeline, tasks, documents. Tasks tab lists open ones. This is the view I’d use in a meeting. One thing missing: I can’t see *why* a task was created—like which appointment or which email kicked it off. Context matters when you’ve been out sick for two days.

**Interviewer:** If you had to invent that, where would it live?

**Participant:** On the task itself—a one-line “Created from: intake follow-up” or a link to the note. Short. I don’t need a novel.

**Interviewer:** Next scenario: a coworker assigned you a task with a due date of today, but you disagree with the priority. Walk me through what you’d do.

**Participant:** I’d open it… there’s priority High. I’d want to change due date or priority and maybe comment to them. I see “Comment on task.” Typing “Can this wait until Thursday? Client no-showed.” Send. Does that notify them? I assume so. I don’t see a confirmation. Small thing, but I’d wonder if Priya got it.

**Interviewer:** Anything feel risky or unclear so far?

**Participant:** Completing a task feels final—good. I’m less sure about deleting. Is there delete? …There’s archive. Prefer that. Also, I’m not seeing bulk actions. On Mondays I clear five tiny tasks. Clicking one by one is annoying but not a dealbreaker for a first version.

**Interviewer:** Last task: create a brand-new task on an existing case from scratch—not from completing another one.

**Participant:** From the case… Add task. Title: “Submit rental assistance packet.” Due Friday. Assign me. Priority… I’ll leave Medium. Save. It appears in the list and… does it show in my inbox? Going back… yes, it’s there. Good. I’d want a keyboard shortcut eventually, but mouse is fine for now.

**Interviewer:** On a scale of 1 to 5, how likely would you use this weekly instead of the spreadsheet for task tracking?

**Participant:** A 4. I’d use it if the whole team did. If only I use it and they stay on the sheet, I still have to update both. Adoption is the real hurdle, not the UI.

**Interviewer:** What would make it a 5?

**Participant:** Two things. One: that note prompt when completing, so compliance doesn’t bite us. Two: a simple digests email in the morning—“You have 6 due today, 2 overdue”—so I don’t have to remember to open the app first thing. Spreadsheet doesn’t ping me either, but email is where I already live.

**Interviewer:** Anything else before we wrap?

**Participant:** The case-plus-task split is right. Don’t make me hunt for work inside case folders all day. And please don’t hide overdue behind a pretty dashboard. The red list is honest. Keep that.

**Interviewer:** Perfect. Thanks, Jordan—this was really helpful.

**Participant:** Happy to help. Send me the next build if you want another pass.
