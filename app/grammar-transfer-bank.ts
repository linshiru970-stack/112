export type GrammarTransferSeed = {
  objective: string;
  unit: string;
  key: string;
  prompt: string;
  correct: string;
  wrong1: string;
  wrong2: string;
  rule: string;
};

type SeedTuple = readonly [key: string, prompt: string, correct: string, wrong1: string, wrong2: string];

const seeds: GrammarTransferSeed[] = [];

function addGroup(objective: string, unit: string, rule: string, items: readonly SeedTuple[]) {
  for (const [key, prompt, correct, wrong1, wrong2] of items) {
    seeds.push({ objective, unit, key, prompt, correct, wrong1, wrong2, rule });
  }
}

// These are deliberately different contexts and sentence decisions, not
// name-only rewrites of the public practice bank. Each group stays at or after
// the objective's teaching point in the curriculum blueprint.
addGroup("G03", "U14", "先找真正的主詞核心，再依單複數決定動詞。", [
  ["each-report", "Each report ___ a cover page.", "needs", "need", "needing"],
  ["one-box", "One of the boxes ___ damaged.", "is", "are", "be"],
  ["there-rooms", "There ___ two meeting rooms upstairs.", "are", "is", "be"],
  ["manager-with-staff", "The manager, together with two assistants, ___ the schedule.", "checks", "check", "checking"],
  ["either-manager-assistants", "Either the manager or the assistants ___ the desk.", "cover", "covers", "covering"],
  ["neither-files-folder", "Neither the files nor the folder ___ on this desk.", "is", "are", "be"],
]);

addGroup("G04", "U03", "明確過去時間用過去式；will 後接原形表示尚未發生的決定或預測。", [
  ["yesterday-confirm", "Yesterday, Lena ___ the booking by phone.", "confirmed", "confirms", "will confirm"],
  ["last-night-send", "The supplier ___ the invoice last night.", "sent", "sends", "will send"],
  ["two-days-ago-meet", "We ___ the new client two days ago.", "met", "meet", "will meet"],
  ["last-week-write", "Kai ___ the first draft last week.", "wrote", "writes", "will write"],
  ["tomorrow-call", "Tomorrow, I will ___ the warehouse.", "call", "called", "calling"],
  ["next-week-submit", "The team will ___ the final report next week.", "submit", "submitted", "submitting"],
  ["this-afternoon-check", "Mina will ___ the order this afternoon.", "check", "checked", "checking"],
  ["next-month-open", "The new branch will ___ next month.", "open", "opened", "opening"],
]);

addGroup("G05", "U17", "進行式描述正在發生的動作；接受動作的主詞需用進行被動。", [
  ["workers-loading", "Look—the workers ___ the truck now.", "are loading", "load", "are being loaded"],
  ["guest-waiting", "At the moment, a guest ___ near the counter.", "is waiting", "waits", "are waiting"],
  ["staff-arranging", "When the manager arrived, the staff ___ the chairs.", "were arranging", "arranged by", "were being arranged"],
  ["boxes-being-loaded", "The boxes ___ onto the truck right now.", "are being loaded", "are loading", "load"],
  ["road-being-repaired", "The road ___ this week, so buses are using another route.", "is being repaired", "is repairing", "repairs"],
  ["tables-being-moved", "When we entered, the tables ___ by two employees.", "were being moved", "were moving", "moved"],
]);

addGroup("G06", "U05", "形容詞描述名詞或放在 be 後；副詞通常修飾動作。", [
  ["instructions-clear", "The revised instructions are ___.", "clear", "clearly", "clarity"],
  ["explain-clearly", "Please explain the new rule ___.", "clearly", "clear", "clearness"],
  ["careful-check", "The technician made a ___ check of the cable.", "careful", "carefully", "care"],
  ["check-carefully", "Please check the address ___.", "carefully", "careful", "care"],
  ["accurate-report", "We need an ___ report before noon.", "accurate", "accurately", "accuracy"],
  ["record-accurately", "The clerk recorded the total ___.", "accurately", "accurate", "accuracy"],
]);

addGroup("G07", "U11", "依名詞是否可數、單複數與是否特定選冠詞、限定詞或數量詞。", [
  ["a-request", "We received ___ request about a refund.", "a", "an", "many"],
  ["an-application", "She submitted ___ online application this morning.", "an", "a", "some"],
  ["the-package", "A package arrived at noon. ___ package is at reception.", "The", "A", "Some"],
  ["any-receipts", "Do you have ___ receipts from the trip?", "any", "much", "another"],
  ["some-information", "We need ___ information before making a decision.", "some", "many", "a"],
  ["fewer-boxes", "The new design uses ___ boxes than the old one.", "fewer", "less", "little"],
  ["less-paper", "This printer uses ___ paper than that model.", "less", "fewer", "many"],
  ["another-copy", "This copy is damaged. Please print ___ copy.", "another", "other", "others"],
]);

addGroup("G08", "U11", "代名詞形式由它在句中的功能決定，並要和先行詞一致。", [
  ["contact-her", "Ms. Lin handles the booking. Please contact ___ directly.", "her", "she", "hers"],
  ["their-orders", "The customers said ___ orders were late.", "their", "them", "theirs"],
  ["card-hers", "This access card belongs to Nina. It is ___.", "hers", "her", "she"],
  ["himself", "Leo introduced ___ to the new team.", "himself", "him", "his"],
  ["themselves", "The applicants completed the forms by ___.", "themselves", "them", "their"],
  ["everyone-needs", "Everyone ___ a visitor badge at this office.", "needs", "need", "needing"],
]);

addGroup("G09", "U06", "被動語態用 be + 過去分詞，主詞是接受動作的人或物。", [
  ["packages-checked", "The packages ___ before they leave the warehouse.", "are checked", "check", "are checking"],
  ["room-cleaned", "The meeting room ___ every morning.", "is cleaned", "cleans", "is cleaning"],
  ["invoice-sent", "The invoice ___ yesterday afternoon.", "was sent", "sent", "was send"],
  ["doors-locked", "The doors ___ at six last night.", "were locked", "locked", "were lock"],
  ["equipment-inspected", "All equipment ___ once a month.", "is inspected", "inspects", "is inspecting"],
  ["chairs-replaced", "Two broken chairs ___ last week.", "were replaced", "replaced", "were replace"],
]);

addGroup("G09", "U13", "延伸被動仍保留 be + p.p.；完成式被動使用 have/has been + p.p.。", [
  ["has-been-approved", "The revised design has been ___.", "approved", "approve", "approving"],
  ["have-been-tested", "The new sensors have been ___ twice.", "tested", "test", "testing"],
  ["must-be-installed", "A replacement part must ___ before use.", "be installed", "installed", "be install"],
  ["should-be-stored", "These records should ___ in a secure folder.", "be stored", "stored", "be storing"],
  ["is-being-packed", "The order ___ right now.", "is being packed", "is packing", "has packing"],
  ["were-being-inspected", "The machines ___ when the alarm sounded.", "were being inspected", "were inspecting", "inspected by"],
]);

addGroup("G10", "U07", "情態動詞後接原形；依語意區分能力、允許、建議與義務。", [
  ["must-show-id", "Visitors ___ show photo ID; it is required.", "must", "may", "could"],
  ["should-call", "If you are going to be late, you ___ call the office first.", "should", "are", "did"],
  ["can-use", "Employees ___ use the side entrance when the main door is closed.", "can", "are", "did"],
  ["may-I", "___ I leave the package at the front desk?", "May", "Was", "Did"],
  ["must-submit", "All applicants must ___ the form by Friday.", "submit", "submits", "submitting"],
  ["should-check", "You should ___ the departure time before leaving.", "check", "checked", "checks"],
]);

addGroup("G10", "U13", "情態被動使用 modal + be + p.p.。", [
  ["must-be-repaired", "The damaged cable must ___ before the machine restarts.", "be repaired", "repair", "be repair"],
  ["should-be-reviewed", "The contract should ___ by the legal team.", "be reviewed", "review", "be reviewing"],
  ["may-be-delayed", "The shipment may ___ by bad weather.", "be delayed", "delay", "be delaying"],
  ["can-be-reused", "These boxes can ___ after inspection.", "be reused", "reuse", "be reusing"],
  ["must-be-recorded", "Every defect must ___ in the report.", "be recorded", "record", "recorded"],
  ["should-be-notified", "Customers should ___ before the schedule changes.", "be notified", "notify", "notified"],
]);

addGroup("G11", "U03", "ask/tell + 人 後面用 to + 原形動詞。", [
  ["ask-lena-send", "Please ask Lena ___ the document before noon.", "to send", "send", "sending"],
  ["tell-kai-call", "The manager told Kai ___ the supplier.", "to call", "calling", "called"],
  ["ask-staff-prepare", "We asked the staff ___ the room early.", "to prepare", "prepare", "preparing"],
  ["tell-driver-wait", "The receptionist told the driver ___ outside.", "to wait", "waited", "waiting"],
  ["ask-me-confirm", "She asked me ___ the order number.", "to confirm", "confirming", "confirmed"],
  ["tell-team-submit", "The supervisor told the team ___ the report today.", "to submit", "submitting", "submitted"],
]);

addGroup("G11", "U10", "常見動詞有固定的 to V 或 V-ing 搭配。", [
  ["plan-attend", "We plan ___ the workshop next month.", "to attend", "attending", "attend"],
  ["decide-register", "Mina decided ___ for the training course.", "to register", "registering", "register"],
  ["hope-finish", "They hope ___ the project this week.", "to finish", "finishing", "finish"],
  ["avoid-send", "Please avoid ___ the same file twice.", "sending", "to send", "send"],
  ["finish-prepare", "Kai finished ___ the slides before lunch.", "preparing", "to prepare", "prepare"],
  ["enjoy-learn", "The new employees enjoy ___ together.", "learning", "to learning", "learned"],
]);

addGroup("G12", "U05", "V-ing 常描述造成感受的事物；V-ed 常描述人或事物受到影響後的狀態。", [
  ["confusing-message", "The original message was ___.", "confusing", "confused", "confuse"],
  ["confused-customer", "The customer felt ___ by the instructions.", "confused", "confusing", "confuse"],
  ["damaged-box", "Please set the ___ box aside.", "damaged", "damaging", "damage"],
  ["missing-page", "We are looking for the ___ page.", "missing", "missed", "miss"],
  ["updated-guide", "Use the ___ guide on the staff portal.", "updated", "updating", "update"],
  ["waiting-passengers", "The ___ passengers moved closer to the gate.", "waiting", "waited", "wait"],
]);

addGroup("G13", "U11", "比較級、最高級、as...as 與 enough 要依比較範圍和名詞可數性選擇。", [
  ["cheaper", "This model is ___ than the older one.", "cheaper", "cheapest", "more cheap"],
  ["most-expensive", "Of the three plans, Plan C is the ___.", "most expensive", "more expensive", "expensiver"],
  ["as-fast-as", "The new printer is as ___ as the old one.", "fast", "faster", "fastest"],
  ["large-enough", "The room is large ___ for twenty people.", "enough", "too", "enoughly"],
  ["fewer-errors", "The second report has ___ errors than the first.", "fewer", "less", "fewest"],
  ["less-time", "The new process takes ___ time than before.", "less", "fewer", "least of"],
]);

addGroup("G14", "U07", "時間介系詞與 by/until 的方向不同：by 是最晚期限，until 是持續到某時。", [
  ["at-eight", "The office opens ___ eight o'clock.", "at", "on", "in"],
  ["on-tuesday", "Our appointment is ___ Tuesday.", "on", "at", "in"],
  ["in-afternoon", "The technician will arrive ___ the afternoon.", "in", "on", "at"],
  ["by-friday", "Please submit the form ___ Friday.", "by", "until", "during"],
  ["open-until-six", "The help desk remains open ___ six.", "until", "by", "during"],
  ["before-meeting", "Please arrive ten minutes ___ the meeting.", "before", "until", "through"],
]);

addGroup("G15", "U04", "because 接子句，because of 接名詞片語；although 表讓步轉折。", [
  ["because-clause", "The meeting moved ___ the manager was ill.", "because", "because of", "despite"],
  ["because-of-rain", "The flight was delayed ___ heavy rain.", "because of", "because", "although"],
  ["although-busy", "___ the store was busy, the staff answered every call.", "Although", "Because of", "Despite of"],
  ["despite-delay", "___ the delay, we arrived before noon.", "Despite", "Although", "Because"],
  ["so-result", "The printer failed, ___ we used the machine downstairs.", "so", "because of", "although"],
  ["however-contrast", "The room is small. ___, it has enough seats.", "However", "Because of", "Unless"],
]);

addGroup("G15", "U14", "時間、條件與讓步子句要保留正確的連接詞與完整句構。", [
  ["if-available", "___ the room is available, we will reserve it.", "If", "Because of", "Despite"],
  ["unless-confirm", "We cannot order lunch ___ the guest count is confirmed.", "unless", "because of", "despite"],
  ["when-arrives", "Please call me ___ the courier arrives.", "when", "because of", "despite"],
  ["before-leave", "Check the address ___ you leave the office.", "before", "because of", "despite"],
  ["after-finish", "Send the report ___ you finish the final check.", "after", "because of", "despite"],
  ["while-update", "Do not close the app ___ it is updating.", "while", "because of", "despite"],
]);

addGroup("G16", "U12", "關係代名詞／副詞要依先行詞是人、物或地點選擇。", [
  ["guest-who", "The guest ___ booked room 408 has arrived.", "who", "where", "whose place"],
  ["flight-that", "The flight ___ leaves at noon is delayed.", "that", "who", "where"],
  ["counter-where", "This is the counter ___ passengers check in.", "where", "who", "whose"],
  ["driver-who", "The driver ___ helped us works for the hotel.", "who", "where", "which place"],
  ["form-that", "Please use the form ___ is attached to the e-mail.", "that", "who", "where"],
  ["company-whose", "We contacted a supplier ___ warehouse is near the airport.", "whose", "who", "where"],
]);

addGroup("G17", "U09", "現在完成式連結過去與現在；since 接起點，for 接期間，yet 常用於否定與問句。", [
  ["since-2024", "Mina has worked here ___ 2024.", "since", "for", "yet"],
  ["for-three-years", "The team has used this system ___ three years.", "for", "since", "already"],
  ["not-yet", "The supplier has not replied ___.", "yet", "already", "since"],
  ["already-finished", "We have ___ finished the first review.", "already", "yet", "since"],
  ["has-arrived", "The package ___, so you can collect it now.", "has arrived", "arrived yesterday", "will arrive"],
  ["yesterday-past", "The package ___ at 3:00 yesterday.", "arrived", "has arrived", "has arriving"],
]);

addGroup("G18", "U18", "先判斷問句功能，再選相符的問詞、助動詞或自然回應。", [
  ["when-at-four", "___ will the technician arrive? — At four.", "When", "Where", "Who"],
  ["where-room-b", "___ is the training session? — In Room B.", "Where", "When", "Why"],
  ["who-ms-lin", "___ is handling the complaint? — Ms. Lin.", "Who", "When", "How often"],
  ["why-delay", "___ was the shipment delayed? — Because of the storm.", "Why", "Where", "Which"],
  ["could-you", "Could you send me the revised file? — ___", "Sure, I'll send it now.", "At the front desk.", "Last Tuesday."],
  ["has-supplier", "Has the supplier confirmed the order? — ___", "Yes, this morning.", "At the warehouse.", "For three boxes."],
]);

addGroup("G19", "U15", "名詞子句依資訊缺口選 that/what/whether；間接問句使用陳述語序。", [
  ["tell-what", "Please tell me ___ the client needs.", "what", "that", "whether the client"],
  ["confirm-that", "The manager confirmed ___ the order was ready.", "that", "what", "where was"],
  ["whether-approved", "We need to know ___ the design was approved.", "whether", "what", "that whether"],
  ["when-arrive", "Do you know when the courier ___?", "will arrive", "will the courier arrive", "arriving"],
  ["where-room-is", "Could you tell me where the meeting room ___?", "is", "is the meeting room", "be"],
  ["what-caused", "The report explains ___ caused the delay.", "what", "that", "whether it"],
]);

addGroup("G20", "U15", "使役結構依動詞選原形、to V 或 have/get + 物 + p.p.。", [
  ["made-us-wait", "The delay made us ___ outside.", "wait", "to wait", "waiting"],
  ["let-her-leave", "The manager let her ___ early.", "leave", "to leave", "leaving"],
  ["help-complete", "This guide helps employees ___ the form.", "complete", "completes", "completed"],
  ["got-supplier-replace", "We got the supplier ___ the lamps.", "to replace", "replace", "replacing"],
  ["had-printer-repaired", "We had the printer ___.", "repaired", "repair", "to repair"],
  ["get-screen-fixed", "Kai will get the screen ___ tomorrow.", "fixed", "fix", "to fix"],
]);

addGroup("G21", "U12", "簡化關係子句時，主動關係常用 V-ing，被動關係常用 p.p.。", [
  ["employees-waiting", "Employees ___ outside should move to Room C.", "waiting", "waited", "wait"],
  ["forms-submitted", "The forms ___ yesterday are on the desk.", "submitted", "submitting", "submit"],
  ["passengers-using", "Passengers ___ Gate 4 should board now.", "using", "used", "use by"],
  ["items-damaged", "Items ___ during delivery will be replaced.", "damaged", "damaging", "damage"],
  ["staff-working", "Staff ___ on Friday will receive the update first.", "working", "worked", "work by"],
  ["orders-received", "Orders ___ before noon ship the same day.", "received", "receiving", "receive"],
]);

addGroup("G22", "U14", "平行結構與成對連接詞兩側要保持相同語法層級。", [
  ["both-and", "The role requires both accuracy ___ patience.", "and", "or", "nor"],
  ["either-or", "You can choose either Monday ___ Tuesday.", "or", "and", "nor"],
  ["neither-nor", "Neither the lobby ___ the café is open yet.", "nor", "and", "or"],
  ["not-only-but-also", "The update is not only faster ___ more reliable.", "but also", "or", "despite"],
  ["verb-parallel", "The job involves checking orders, answering calls, and ___ reports.", "preparing", "prepare", "prepared"],
  ["noun-parallel", "We compared the price, delivery time, and ___.", "warranty", "reliable", "quickly"],
]);

addGroup("G23", "U10", "recommend/request/require that 後的動詞使用原形；被動則用 be + p.p.。", [
  ["recommend-register", "The trainer recommended that each applicant ___ online.", "register", "registers", "registering"],
  ["request-arrive", "We request that every guest ___ by nine.", "arrive", "arrives", "arriving"],
  ["require-wear", "The policy requires that all visitors ___ a badge.", "wear", "wears", "wearing"],
  ["suggest-check", "Mina suggested that he ___ the address again.", "check", "checks", "checking"],
  ["request-be-sent", "The manager requested that the invoice ___ today.", "be sent", "is sent", "sent it"],
  ["require-be-reviewed", "The policy requires that every complaint ___ by a supervisor.", "be reviewed", "is reviewed", "reviewing"],
]);

addGroup("G24", "U15", "固定句型要把整組搭配一起辨認，例如 be supposed to、used to 與動詞／形容詞 + 介系詞。", [
  ["supposed-sign", "Visitors are supposed ___ at reception.", "to sign in", "signing in", "sign in to"],
  ["used-close", "The office used ___ at five, but now it closes at six.", "to close", "to closing", "close"],
  ["used-working", "Staff are used to ___ remotely twice a week.", "working", "work", "worked"],
  ["responsible-for", "Lena is responsible ___ the weekly report.", "for", "to", "with"],
  ["comply-with", "All suppliers must comply ___ the safety rules.", "with", "for", "to"],
  ["apply-for", "Kai plans to apply ___ the supervisor position.", "for", "to", "with"],
  ["participate-in", "Twenty employees participated ___ the workshop.", "in", "on", "at"],
  ["interested-in", "The client is interested ___ the annual plan.", "in", "for", "to"],
]);

addGroup("G25", "U16", "整合題要同時看句意、結構、搭配與證據強度，不能只靠一個熟悉字。", [
  ["evidence-may", "The report says the change ___ reduce waiting time; it does not guarantee it.", "may", "must", "proved"],
  ["unless-same-method", "The two figures cannot be compared fairly ___ the method is the same.", "unless", "because of", "despite"],
  ["according-record", "___ the booking record, the room was confirmed at 10:42.", "According to", "Although", "Unless"],
  ["likely-not-certain", "The phrase 'is likely to' means the result is ___.", "probable but not certain", "guaranteed", "already completed"],
  ["evidence-indicates", "The survey ___ a difference, but it does not prove the cause.", "indicates", "guarantees", "orders"],
  ["scope-some", "The study involved one office, so the safest conclusion refers to ___.", "that office's sample", "all workers everywhere", "a guaranteed rule"],
  ["next-step-verify", "The e-mail says payment is pending. What is the safest next step? ___", "Verify payment before confirming shipment.", "Assume shipment is complete.", "Ignore the payment status."],
  ["paraphrase-request", "'Please submit the form by noon' is closest to ___.", "Send the form no later than noon.", "Start the form after noon.", "Keep the form until tomorrow."],
]);

export const GRAMMAR_TRANSFER_SEEDS: readonly GrammarTransferSeed[] = seeds;
