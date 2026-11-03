/* Night Shift: Laundromat — content. Pure data: nights, rules, regulars, events, endings. No DOM. */
(function (root) {
'use strict';

const NIGHTS = 14, FREE_NIGHTS = 3, TICKS = 21, TICK_MIN = 20; // 23:00 + 21×20min = 06:00
const PRICES = [3, 4, 5];

const MACHINES = [
  { id: 'W1', kind: 'washer', name: 'Washer 1' }, { id: 'W2', kind: 'washer', name: 'Washer 2' }, { id: 'W3', kind: 'washer', name: 'Washer 3' },
  { id: 'W4', kind: 'washer', name: 'Washer 4' }, { id: 'W5', kind: 'washer', name: 'Washer 5' },
  { id: 'D1', kind: 'dryer', name: 'Dryer 1' }, { id: 'D2', kind: 'dryer', name: 'Dryer 2' }, { id: 'D3', kind: 'dryer', name: 'Dryer 3' }
];

/* One rule per night. check = engine hook. The sheet shows every rule gained so far. */
const RULES = [
  { n: 1, text: 'Mop the floor before 1am. Every night.', check: 'mop_before_1', note: 'A wet floor at 1am is a broken rule.' },
  { n: 2, text: 'Washer 4 does not run after midnight. Do not load it.', check: 'w4_midnight', note: 'Washer 4 never jams and takes any load. That is the point.' },
  { n: 3, text: 'After 3am, do not open the door for the woman in the blue coat, even if she knocks politely.', check: 'event' },
  { n: 4, text: 'Count the change twice. If the numbers differ, write down the second one.', check: 'event' },
  { n: 5, text: 'Do not leave a dryer running empty. Switch it off, even if you did not start it.', check: 'dryers_off', note: 'Checked at 6am.' },
  { n: 6, text: 'If a customer asks what year it is, tell them. Do not ask why.', check: 'event' },
  { n: 7, text: 'If the power runs out, close up and go home. Do not stay in the dark.', check: 'event' },
  { n: 8, text: 'There is no Washer 6.', check: 'event' },
  { n: 9, text: 'The man who smells of chlorine pays in exact change. Give him nothing back.', check: 'event' },
  { n: 10, text: 'Do not read the entry log after 4am.', check: 'log_after_4' },
  { n: 11, text: 'If your own name appears in the entry log, go to the back room and stay there until it is gone.', check: 'event' },
  { n: 12, text: 'Do not mop. Not tonight.', check: 'no_mop', note: 'Rule 1 still stands.' },
  { n: 13, text: 'Leave the door unlocked at 5:40. Someone is coming for their washing.', check: 'event' },
  { n: 14, text: 'At six, hand the sheet to whoever is standing at the register. Do not look at their shoes.', check: 'event' }
];

/* Regulars: ten people whose behaviour drifts across the fortnight. Arcs are authored beats placed on nights at ticks. */
const REGULARS = [
  { id: 'okafor', name: 'Mrs Okafor', look: 'Night nurse. Scrubs, a bag of scrubs, a second bag of scrubs.' },
  { id: 'dale', name: 'Dale', look: 'Long-haul driver. Pays in coins he keeps in a coffee tin.' },
  { id: 'bluecoat', name: 'The woman in the blue coat', look: 'Stands under the awning. Has not, so far, come in.' },
  { id: 'theo', name: 'Theo', look: 'Student. Headphones. Sleeps in the plastic chair by Dryer 2 and wakes exactly when his cycle ends.' },
  { id: 'chlorine', name: 'The man who smells of chlorine', look: 'Lifeguard, probably. Towels, always towels. Exact change, always.' },
  { id: 'pat', name: 'Pat', look: "The owner's brother. Drops by to see how you are getting on. Does not bring washing." },
  { id: 'twins', name: 'The twins', look: 'Two children, nine or ten, with one pillowcase of clothes between them and no adult.' },
  { id: 'ruth', name: 'Ruth', look: 'You have never met Ruth. The rule sheet is in her handwriting.' },
  { id: 'hale', name: 'Mr Hale', look: 'Folds everything on the long table, edge to edge. The same shirt, every night, a little greyer.' },
  { id: 'bea', name: 'Bea', look: 'From the bakery across the road. Flour on everything. 4:40 sharp, aprons and tea towels, and a bun for you.' }
];

/* Authored spine. at = tick (0 = 23:00, 3 = 00:00, 6 = 01:00, 9 = 02:00, 12 = 03:00, 15 = 04:00, 18 = 05:00, 20 = 05:40).
   Effects: cash, sanity, power, det, coins, rule:{n, kept}, flag, entry (name added to the log), camera (what the camera shows next check),
   phantom:'W2' (start a cycle nobody loaded), log (a line in the night log), wet:true, custom hooks by id. cond: 'flag:x' | '!flag:x' | 'cashOver:n' | 'sanityUnder:n' */
const SPINE = [
  // ---- Night 1: the job is simple ----
  { id: 'n1_open', night: 1, at: 0, title: 'Eleven.', text: 'The day attendant left the keys on the register and a sheet of paper under them, lined, in blue ink. One rule. The machines hum. The floor is wet by the door where the last customer shook out an umbrella.',
    choices: [{ label: 'Read the sheet', eff: { log: 'Read the rule sheet. One rule.' } }] },
  { id: 'n1_okafor', night: 1, at: 2, who: 'okafor', text: 'Mrs Okafor, straight off a shift, two bags. "Any washer but 4, love. Four eats socks." She laughs. She has been coming here longer than the machines.',
    choices: [{ label: 'Serve her', eff: { customer: { name: 'Mrs Okafor', det: true } } }, { label: 'Ask about Washer 4', eff: { sanity: -2, log: '"It eats socks," she said again, and did not laugh the second time.' } }] },
  { id: 'n1_dale', night: 1, at: 5, who: 'dale', text: 'Dale tips a coffee tin of coins onto the counter. Dollars, quarters, a button. You count it out. One quarter is bright, unworn, and the year on it is next year.',
    choices: [{ label: 'Take it anyway', eff: { cash: 4, coins: 2, flag: 'coin_future', log: 'A quarter from next year. Took it. Money is money.' } }, { label: 'Hand that one back', eff: { cash: 4, sanity: 1, log: 'Handed the bright quarter back. He looked at it a long time and put it in a different pocket.' } }] },
  { id: 'n1_bea', night: 1, at: 17, who: 'bea', text: 'Bea, flour to the elbows, aprons and tea towels and a paper bag warm on the counter. "You the new one? Eat that. Nights are long."',
    choices: [{ label: 'Eat the bun', eff: { sanity: 6, customer: { name: 'Bea', det: false }, log: 'Bea. A bun. The best twenty minutes of the night.' } }] },
  { id: 'n1_close', night: 1, at: 20, title: 'Twenty to six.', text: 'The sky over the car park is the colour of a dryer window. You put the keys on the register. The sheet is where you left it. There are two rules on it now.',
    choices: [{ label: 'Go home', eff: {} }] },

  // ---- Night 2 ----
  { id: 'n2_hale', night: 2, at: 1, who: 'hale', text: 'Mr Hale, with one shirt. He washes it, dries it, folds it on the long table edge to edge, and sits with it in his lap until six. He always has, the sheet does not say.',
    choices: [{ label: 'Serve him', eff: { customer: { name: 'Mr Hale', det: false } } }] },
  { id: 'n2_w4', night: 2, at: 4, text: 'Twenty past midnight. Washer 4 is empty and clean and quiet, and somebody has left a basket of towels in front of it with a five-dollar note on top. Nobody is in the shop.',
    choices: [{ label: 'Load Washer 4', eff: { cash: 5, w4load: true, log: 'Loaded Washer 4 after midnight. Five dollars. Nobody came back for the towels.' } }, { label: 'Leave it', eff: { log: 'Left the basket. At six it was still there. The note was gone.' } }] },
  { id: 'n2_theo', night: 2, at: 8, who: 'theo', text: 'Theo, headphones, one load. He sets it going in Washer 2 and is asleep in the chair before the drum fills. His head does not move for the whole cycle.',
    choices: [{ label: 'Serve him', eff: { customer: { name: 'Theo', det: true, machine: 'W2' } } }] },
  { id: 'n2_pat', night: 2, at: 14, who: 'pat', text: 'Pat, in a good coat, no washing. "Owner\'s brother. Just seeing how you\'re settling. The last one left a bit sudden." He looks at the sheet on the register and does not pick it up.',
    choices: [{ label: '"Settling fine."', eff: { log: 'Pat came by. Did not ask about the sheet. Did not need to.' } }, { label: 'Ask about the last attendant', eff: { sanity: -3, flag: 'asked_ruth', log: '"Ruth? She\'s fine," Pat said. "She\'s fine." Twice.' } }] },

  // ---- Night 3: the woman in the blue coat ----
  { id: 'n3_twins', night: 3, at: 2, who: 'twins', text: 'Two children with one pillowcase. No adult in the car park. They have exact change for one wash, counted into a stack. "Our mum said the night one is kind."',
    choices: [{ label: 'Serve them', eff: { customer: { name: 'The twins', det: false }, sanity: 1, log: 'The twins. One wash. They sat on the folding table and swung their legs and did not speak once.' } }, { label: 'Wash it free and call someone', eff: { customer: { name: 'The twins', det: true, free: true }, sanity: 3, cash: -4, log: 'Washed the pillowcase for nothing and rang the number on the wall. It rang out.' } }] },
  { id: 'n3_knock', night: 3, at: 13, who: 'bluecoat', title: 'Twenty past three.', text: 'A knock. Polite, three taps, the way you knock on a friend\'s door. The woman in the blue coat is under the awning with a laundry bag held in both arms, and the door is locked because you locked it at three, because the sheet says.',
    choices: [{ label: 'Open the door', eff: { cash: 40, sanity: -15, rule: { n: 3, kept: false }, entry: 'The woman in the blue coat', flag: 'opened_blue', log: 'Opened the door. She paid forty for one bag and did not take her coat off and did not take the bag out of her arms. Washer 3 ran empty for a full cycle. She said thank you at the end.' } }, { label: 'Do not open the door', eff: { sanity: -4, rule: { n: 3, kept: true }, log: 'Did not open the door. She knocked twice more, politely, and then stood under the awning until the sky went grey.' } }] },
  { id: 'n3_bea', night: 3, at: 17, who: 'bea', text: 'Bea. Buns, two tonight. "Saw her out there. Don\'t worry about her. Everyone worries about her." She does not say who.',
    choices: [{ label: 'Eat', eff: { sanity: 6, customer: { name: 'Bea', det: false } } }] },

  // ---- Night 4: counting ----
  { id: 'n4_count', night: 4, at: 7, title: 'Twenty past one.', text: 'You count the change drawer. You count it again. The second number is eleven dollars higher. There is a pencil on the sheet that was not there.',
    choices: [{ label: 'Write down the second number', eff: { cash: 11, rule: { n: 4, kept: true }, log: 'Counted twice. Wrote down the second. The drawer agrees with the sheet now, which is not the same as agreeing with me.' } }, { label: 'Write down the first number', eff: { rule: { n: 4, kept: false }, sanity: -6, log: 'Wrote down the first number. The second number did not go away. It is in the drawer.' } }] },
  { id: 'n4_dale', night: 4, at: 10, who: 'dale', text: 'Dale. The tin again. Every coin is bright now, and the years are all wrong, and he is counting them out like a man paying a debt. "Long haul," he says. "Long one this time."',
    choices: [{ label: 'Take the coins', eff: { cash: 8, coins: 6, flag: 'coin_future', sanity: -3, log: 'Took Dale\'s coins. Six of them are from years that have not happened. The drawer does not mind.' } }, { label: 'Wash it for nothing', eff: { customer: { name: 'Dale', det: true, free: true }, sanity: 2, log: 'Washed Dale\'s load free. He left the tin on the counter. It is heavier than it looks.' } }] },
  { id: 'n4_hale', night: 4, at: 15, who: 'hale', text: 'Mr Hale, the shirt. It was white on Monday. It is the grey of a dryer\'s lint screen now. He folds it edge to edge and holds it and looks at Washer 4.',
    choices: [{ label: 'Serve him', eff: { customer: { name: 'Mr Hale', det: false } } }, { label: 'Offer him a new shirt from lost property', eff: { sanity: 2, flag: 'hale_shirt', log: 'Offered Mr Hale a shirt from the lost box. He said, "That\'s mine too," and it was.' } }] },

  // ---- Night 5: dryers ----
  { id: 'n5_dryer', night: 5, at: 3, text: 'Midnight. Dryer 3 is running. It is warm, and loud, and full, and the shop has been empty since Mrs Okafor left at half eleven with both her bags.', eff: { phantom: 'D3' },
    choices: [{ label: 'Switch it off', eff: { sanity: -4, dryerOff: 'D3', log: 'Switched off Dryer 3. The drum stopped. The clothes inside were dry and folded.' } }, { label: 'Let it finish', eff: { power: -3, sanity: -2, log: 'Let Dryer 3 finish. When it stopped, it was empty.' } }] },
  { id: 'n5_theo', night: 5, at: 9, who: 'theo', text: 'Theo is in the chair asleep. His cycle ended ten minutes ago. He has not woken. The washer door is open and the drum is empty and his bag is by his feet, still full and dry.',
    choices: [{ label: 'Wake him', eff: { sanity: -5, log: 'Woke Theo. He looked at the empty drum and said, "Did it finish?" and I said yes.' } }, { label: 'Let him sleep', eff: { sanity: -2, log: 'Let Theo sleep. At five he stood up, took his dry bag, said thanks, and left.' } }] },
  { id: 'n5_okafor', night: 5, at: 16, who: 'okafor', text: 'Mrs Okafor, back for her second bag. She only brought one tonight. "Socks," she says, and tips the bag out: it is all socks, hundreds, none a pair.',
    choices: [{ label: 'Serve her', eff: { customer: { name: 'Mrs Okafor', det: true }, sanity: -3, log: 'Washed the socks. Washer 2 took two cycles. The count went up.' } }] },

  // ---- Night 6: the year ----
  { id: 'n6_year', night: 6, at: 12, who: 'dale', text: 'Dale, no tin, no washing. He stands at the counter and asks, carefully, like a man asking directions in a language he learned from a book, what year it is.',
    choices: [{ label: 'Tell him', eff: { rule: { n: 6, kept: true }, sanity: -3, log: 'Told Dale the year. He nodded like it was the answer he feared and thanked me and went out to the truck and sat in it until six.' } }, { label: '"Why?"', eff: { rule: { n: 6, kept: false }, sanity: -10, flag: 'asked_why', log: 'Asked Dale why. He told me. I have not written it down.' } }] },
  { id: 'n6_pat', night: 6, at: 6, who: 'pat', text: 'Pat. "Takings are up. Keep it up." He puts a twenty on the counter for you. He is looking at the sheet. "She wrote small, didn\'t she."',
    choices: [{ label: 'Take the twenty', eff: { cash: 20, log: 'Pat left a twenty. "For the good work."' } }, { label: 'Ask Pat about the rules', eff: { sanity: -4, cash: 20, flag: 'asked_rules', log: '"Those? Those are Ruth\'s. I\'d keep them, I would. She did."' } }] },
  { id: 'n6_bea', night: 6, at: 17, who: 'bea', text: 'Bea, at 4:40. "You look like a week of nights," she says, and leaves two buns and takes none of the change.',
    choices: [{ label: 'Eat', eff: { sanity: 7, customer: { name: 'Bea', det: false } } }] },

  // ---- Night 7: the dark ----
  { id: 'n7_power', night: 7, at: 2, title: 'Twenty to midnight.', text: 'The meter by the back door is running faster than the machines account for. Something is drawing power that is not on the floor. The budget will not last until six.', eff: { power: -18 },
    choices: [{ label: 'Check the back room', eff: { sanity: -6, power: 6, log: 'Checked the back room. The old mangle was running. It is not plugged in. I unplugged it anyway.' } }, { label: 'Run fewer machines', eff: { flag: 'power_save', log: 'Took two washers off. The meter slowed. Not by enough.' } }] },
  { id: 'n7_chlorine', night: 7, at: 9, who: 'chlorine', text: 'The man who smells of chlorine. Towels. He counts out exact change, coin by coin, in the order the sheet would like. He does not ask for a dryer. He never has.',
    choices: [{ label: 'Serve him', eff: { customer: { name: 'The man who smells of chlorine', det: false } } }] },
  { id: 'n7_twins', night: 7, at: 14, who: 'twins', text: 'The twins, 3:40 in the morning, one pillowcase. The same clothes as before. "Our mum said you\'d remember us."',
    choices: [{ label: 'Wash it free', eff: { customer: { name: 'The twins', det: true, free: true }, sanity: 2, log: 'Washed the twins\' pillowcase free. Rang the number on the wall again. A child answered and said, "They\'re at the laundrette."' } }, { label: 'Ask where their mum is', eff: { sanity: -8, log: '"At home," they said together. "Waiting for the washing."' } }] },

  // ---- Night 8: washer 6 ----
  { id: 'n8_w6', night: 8, at: 5, text: 'A customer you do not know, a man in a suit, wet to the knee. "Six, please." He holds a twenty out. There are five washers along the wall. You count them. There are five. He is looking at the sixth.',
    choices: [{ label: '"There is no Washer 6."', eff: { rule: { n: 8, kept: true }, sanity: -3, log: 'Told the man in the suit there is no Washer 6. He said, "Not yet," and left the twenty on the counter.', cash: 20 } }, { label: 'Take him to Washer 6', eff: { rule: { n: 8, kept: false }, cash: 40, sanity: -14, flag: 'w6', log: 'Took him to Washer 6. It took his load and his twenty and the cycle ran in silence. I did not look at the number on the door when I came back.' } }] },
  { id: 'n8_hale', night: 8, at: 12, who: 'hale', text: 'Mr Hale with the shirt, which is the grey of wet paper now. He does not wash it tonight. He folds it, dry, edge to edge, and puts it on the counter, and sits in Theo\'s chair, and Theo is not here.',
    choices: [{ label: 'Keep the shirt safe', eff: { sanity: 2, flag: 'hale_shirt_kept', log: 'Put Mr Hale\'s shirt under the register. He watched me do it and nodded.' } }, { label: 'Give it back to him', eff: { sanity: -2, log: 'Gave Mr Hale his shirt back. "Keep it," he said. I did not.' } }] },
  { id: 'n8_log', night: 8, at: 16, text: 'The entry log, by the door, in the box with the pen on a string. You have been filling it in all week. There is a name on tonight\'s page in a hand that is not yours, and no one has come in since the twins.', eff: { entry: 'R. Marsh' },
    choices: [{ label: 'Check the camera', eff: { sanity: -5, camera: 'The door. Nobody. The awning, the car park, the bakery light across the road. Nobody.', log: 'Checked the camera against the log. Nobody at the door. The name stayed.' } }, { label: 'Cross the name out', eff: { sanity: -3, flag: 'crossed_out', log: 'Crossed the name out. In the morning the line was gone, and the name was not.' } }] },

  // ---- Night 9: exact change ----
  { id: 'n9_chlorine', night: 9, at: 10, who: 'chlorine', text: 'The man who smells of chlorine puts down coins, exact to the cent, and then a ten-dollar note on top, and waits. He has never done this. The sheet has a rule about him.',
    choices: [{ label: 'Give him nothing back', eff: { rule: { n: 9, kept: true }, cash: 14, sanity: -4, log: 'Took the ten and gave nothing back. He waited a full minute, then nodded like a man who has lost a bet he wanted to lose.' } }, { label: 'Give him his change', eff: { rule: { n: 9, kept: false }, cash: 4, coins: -6, sanity: -9, flag: 'chlorine_change', log: 'Gave him his change. He counted it twice, and the second time it was more, and he left all of it on the counter and did not come back for the towels.' } }] },
  { id: 'n9_theo', night: 9, at: 3, who: 'theo', text: 'Theo\'s cycle is running in Washer 2. His bag is by the chair. The chair is empty. The entry log says Theo, 23:40. The camera, when you think to look, shows the chair, the bag, and nobody.',
    choices: [{ label: 'Let the cycle finish', eff: { sanity: -6, phantom: 'W2', log: 'Let Theo\'s cycle finish. Unloaded it at one. The clothes were his. He was not.' } }, { label: 'Stop the machine', eff: { sanity: -3, log: 'Stopped Washer 2 mid-cycle. Wet clothes, nobody\'s. Put them in a bag under the counter with the shirt.' } }] },
  { id: 'n9_bea', night: 9, at: 17, who: 'bea', text: 'Bea. One bun, and she sits for a minute, which she never does. "Ruth used to say the trick was not to count the nights. I\'m not telling you that. I\'m just telling you what she said."',
    choices: [{ label: 'Eat', eff: { sanity: 6, customer: { name: 'Bea', det: false }, log: 'Bea stayed a minute. The shop was warm for that minute.' } }] },

  // ---- Night 10: the log ----
  { id: 'n10_dale', night: 10, at: 1, who: 'dale', text: 'Dale\'s truck is in the car park. It has been there since you arrived. The cab light is on. He does not come in. At some point you stop looking.',
    choices: [{ label: 'Go out and check', eff: { sanity: -7, log: 'Went out to Dale\'s truck. Empty cab, engine warm, the coffee tin on the seat, full. Left it.' } }, { label: 'Keep working', eff: { sanity: -2, log: 'Did not go out to the truck. It was gone by six. It did not start; it was gone.' } }] },
  { id: 'n10_ruth', night: 10, at: 11, who: 'ruth', text: 'A woman at the counter you have not seen come in. Tidy, tired, a cardigan with the bakery\'s flour on one sleeve. She looks at the sheet, then at you. "You\'re keeping them," she says. "Good."',
    choices: [{ label: '"Are you Ruth?"', eff: { sanity: -5, flag: 'met_ruth', log: 'Asked if she was Ruth. "I was the night one," she said. "Now you are." She had no washing.' } }, { label: 'Say nothing', eff: { sanity: -2, log: 'A woman in a cardigan looked at the sheet and said good, and left, and the entry log did not record her.' } }] },
  { id: 'n10_okafor', night: 10, at: 16, who: 'okafor', text: 'Mrs Okafor, 4:20, no scrubs. Jeans and a jumper, as if off duty for the first time in years. "Last night at the hospital," she says. "They\'ve let me go. Imagine." She has two bags. They are both empty.',
    choices: [{ label: 'Wash the empty bags', eff: { customer: { name: 'Mrs Okafor', det: false, free: true }, sanity: -3, log: 'Washed Mrs Okafor\'s empty bags. She watched them go round and seemed comforted.' } }, { label: 'Make her tea instead', eff: { sanity: 3, cash: -1, log: 'Made Mrs Okafor tea from the kettle in the back. She drank it with both hands and told me about a boy she saved in 1998.' } }] },

  // ---- Night 11: your name ----
  { id: 'n11_name', night: 11, at: 8, title: 'Twenty to two.', text: 'The entry log. Mrs Okafor, 23:10. Mr Hale, 23:30. Then, in the hand that is not yours, your own name, 01:20. You did not come in at 01:20. You have been here since eleven.', eff: { entry: '__you__' },
    choices: [{ label: 'Go to the back room and wait', eff: { rule: { n: 11, kept: true }, sanity: -6, backroom: 3, log: 'Went to the back room and sat with the mangle until the name was gone. An hour. The machines ran themselves and the drawer was eleven dollars up.' } }, { label: 'Stay at the register', eff: { rule: { n: 11, kept: false }, sanity: -13, flag: 'stayed_for_name', log: 'Stayed at the register. At 01:40 the door opened and nobody came in and the name in the log got a time out.' } }] },
  { id: 'n11_hale', night: 11, at: 14, who: 'hale', text: 'Mr Hale asks for his shirt. It is under the register, or it was. You look. There is a shirt there, folded edge to edge, white, new, with the tags on.',
    choices: [{ label: 'Give him the white shirt', eff: { sanity: 2, flag: 'hale_white', log: 'Gave Mr Hale the white shirt. He put it on over the grey one. He looked, for a moment, like a photograph of himself.' } }, { label: 'Say it has gone', eff: { sanity: -5, log: 'Told Mr Hale the shirt had gone. He said, "I know," and sat down anyway.' } }] },

  // ---- Night 12: do not mop ----
  { id: 'n12_wet', night: 12, at: 0, title: 'Eleven.', text: 'The floor is wet from the door to the dryers. Not rain. The sheet, tonight, says do not mop. The sheet, every night, says mop before one.', eff: { wet: true },
    choices: [{ label: 'Read both rules again', eff: { log: 'Two rules that cannot both be kept. Ruth wrote them both.' } }] },
  { id: 'n12_twins', night: 12, at: 9, who: 'twins', text: 'The twins, with their mother. She is young and tired and ordinary and apologises for them. "They kept saying they\'d been coming here. We only moved last week." She has never seen you before.',
    choices: [{ label: 'Serve them', eff: { customer: { name: 'The twins and their mother', det: true }, sanity: 5, log: 'The twins have a mother. She paid in notes with this year on them. I could have wept.' } }] },
  { id: 'n12_pat', night: 12, at: 15, who: 'pat', text: 'Pat. He does not come to the counter. He stands at the door and reads the sheet from there, all of it, and says, "Two more nights. Ruth did sixteen."',
    choices: [{ label: '"What happened on the sixteenth?"', eff: { sanity: -6, flag: 'asked_sixteen', log: '"She handed it over," Pat said. "That\'s all. She handed it over."' } }, { label: 'Nod', eff: { sanity: -1, log: 'Nodded at Pat. He nodded back and did not come in.' } }] },

  // ---- Night 13: 5:40 ----
  { id: 'n13_unlock', night: 13, at: 20, title: 'Twenty to six.', text: 'The sheet says unlock the door. Someone is coming for their washing. Every machine is empty. The bag under the counter, with Theo\'s clothes and Mr Hale\'s grey shirt, is heavier than it was.',
    choices: [{ label: 'Unlock the door', eff: { rule: { n: 13, kept: true }, sanity: -8, flag: 'unlocked_540', log: 'Unlocked the door at 5:40. At 5:50 it opened. I was in the back room, by choice. When I came out the bag under the counter was empty and folded.' } }, { label: 'Keep it locked', eff: { rule: { n: 13, kept: false }, sanity: -5, cash: -30, log: 'Kept the door locked. Somebody tried the handle at 5:50, politely, and then the drawer was thirty dollars down.' } }] },
  { id: 'n13_bea', night: 13, at: 17, who: 'bea', text: 'Bea, early, 4:20. "One more after this?" she says. "Then it\'s somebody else\'s turn. That\'s how it goes. Eat your bun."',
    choices: [{ label: 'Eat', eff: { sanity: 8, customer: { name: 'Bea', det: false }, log: 'Bea early. Two buns. "That\'s how it goes."' } }] },

  // ---- Night 14: the sheet ----
  { id: 'n14_open', night: 14, at: 0, title: 'Eleven.', text: 'Fourteen rules on the sheet. The paper is soft at the folds. The machines hum. The floor is dry. Everything you know about this job is on one page, in two hands.',
    choices: [{ label: 'Begin', eff: {} }] },
  { id: 'n14_everyone', night: 14, at: 10, text: 'Half past two. Mrs Okafor, Mr Hale, Dale, the twins, the man who smells of chlorine, Theo in his chair. All of them, at once, all with washing, all quiet. None of them on the camera.',
    choices: [{ label: 'Serve them all', eff: { cash: 36, sanity: -12, log: 'Served the whole shop. Eight machines, eight loads, no complaints, no one on camera. The best takings of the fortnight.' } }, { label: 'Serve only the ones who speak', eff: { cash: 12, sanity: -5, log: 'Served the twins and Mr Hale, who said good evening. The others waited until the cycles ended and left with dry clothes they had not washed.' } }] },
  { id: 'n14_handover', night: 14, at: 20, title: 'Six.', text: 'Somebody is standing at the register. You did not see them come in. They are holding out a hand for the sheet. You have not looked at their shoes. You could.',
    choices: [{ label: 'Hand over the sheet', eff: { rule: { n: 14, kept: true }, flag: 'handed_over', log: 'Handed over the sheet. Did not look down.' } }, { label: 'Keep the sheet', eff: { rule: { n: 14, kept: false }, sanity: -10, flag: 'kept_sheet', log: 'Kept the sheet. The hand stayed out for a while, then went into a coat pocket, and the person went and stood under the awning.' } }, { label: 'Look at their shoes', eff: { rule: { n: 14, kept: false }, sanity: -18, flag: 'looked', log: 'Looked. They were mine.' } }] }
];

/* Minor events: per-night tables by weight; some gated by night. Random, with a cooldown. */
const MINOR = [
  { id: 'spill', min: 1, w: 4, text: 'A machine has overflowed, or the ceiling has, and the floor by the dryers is wet again.', choices: [{ label: 'Note it', eff: { wet: true } }] },
  { id: 'slip', min: 1, w: 3, cond: 'wet', text: 'A customer slips on the wet floor, catches the folding table, swears, and leaves without paying.', choices: [{ label: 'Apologise', eff: { cash: -4, sanity: -2 } }] },
  { id: 'jam', min: 1, w: 4, text: 'A washer stops mid-cycle with a sound like a coin in a throat.', choices: [{ label: 'Note it', eff: { jam: true } }] },
  { id: 'radio', min: 1, w: 3, text: 'The radio in the back room comes on by itself. Local station, weather, a song you half know. It is company.', choices: [{ label: 'Leave it on', eff: { sanity: 2, power: -1 } }, { label: 'Switch it off', eff: { power: 0 } }] },
  { id: 'vending', min: 1, w: 3, text: 'The detergent vending machine has jammed with a box halfway out.', choices: [{ label: 'Shake it free', eff: { det: 1, sanity: 1 } }, { label: 'Leave it', eff: {} }] },
  { id: 'coins', min: 2, w: 3, text: 'In the coin return of Dryer 1: four quarters, all the same year, a year from now.', choices: [{ label: 'Pocket them', eff: { coins: 4, cash: 1, sanity: -2 } }, { label: 'Leave them', eff: { sanity: -1 } }] },
  { id: 'hum', min: 3, w: 4, text: 'The hum of the shop drops by a semitone. Every machine. Then comes back.', choices: [{ label: 'Note it', eff: { sanity: -2 } }] },
  { id: 'chair', min: 3, w: 3, text: 'The plastic chair by Dryer 2 is rocking, gently, the way a chair rocks when someone has just stood up from it.', choices: [{ label: 'Steady it', eff: { sanity: -3 } }, { label: 'Let it stop on its own', eff: { sanity: -1 } }] },
  { id: 'phantom', min: 3, w: 5, text: 'A machine along the wall has started a cycle. You did not load it. Nobody is in the shop.', choices: [{ label: 'Let it run', eff: { phantomAny: true, sanity: -3 } }, { label: 'Stop it', eff: { sanity: -2, power: 1 } }] },
  { id: 'lost', min: 2, w: 3, text: 'The lost-property box has a child\'s shoe in it that was not there at eleven. Just one.', choices: [{ label: 'Put it by the door', eff: { sanity: -2 } }, { label: 'Leave it in the box', eff: {} }] },
  { id: 'cat', min: 1, w: 2, text: 'The bakery cat has come in out of the cold and is asleep on the warm top of Dryer 3.', choices: [{ label: 'Let it sleep', eff: { sanity: 3 } }] },
  { id: 'customer_rush', min: 1, w: 3, text: 'A taxi pulls up and three people get out with laundry bags, all at once, all in a hurry.', choices: [{ label: 'Here we go', eff: { rush: 3 } }] },
  { id: 'lights', min: 5, w: 3, text: 'The tube over Washer 4 dims to a brown glow and stays there. The others are fine.', choices: [{ label: 'Leave it', eff: { sanity: -2 } }, { label: 'Switch the bank off', eff: { power: 2, sanity: -3 } }] },
  { id: 'knock_late', min: 6, w: 2, text: 'Three polite taps on the glass. You do not look up. Looking up is a choice.', choices: [{ label: 'Keep your eyes on the drawer', eff: { sanity: -3 } }, { label: 'Look up', eff: { sanity: -6, camera: 'The awning. Empty. A laundry bag on the ground.' } }] },
  { id: 'fold', min: 4, w: 3, text: 'On the long table: a load folded edge to edge, warm, nobody\'s.', choices: [{ label: 'Bag it for lost property', eff: { sanity: -2 } }, { label: 'Leave it where it is', eff: { sanity: -1 } }] },
  { id: 'change_short', min: 2, w: 3, text: 'The change drawer is short. Not by much. By the price of one wash.', choices: [{ label: 'Make it up from your pocket', eff: { cash: -4, sanity: 1 } }, { label: 'Let it be short', eff: { sanity: -2 } }] },
  { id: 'rain', min: 1, w: 3, text: 'Rain, hard, on the car park. Nobody will come for an hour. The shop is warm and loud and yours.', choices: [{ label: 'Rest a while', eff: { sanity: 4 } }] },
  { id: 'drawer_up', min: 7, w: 3, text: 'The drawer is up. Not by a wash. By an odd amount, in coins, as if someone paid for something you do not sell.', choices: [{ label: 'Keep it', eff: { cash: 7, sanity: -3 } }, { label: 'Put it in the lost box', eff: { sanity: -1 } }] },
  { id: 'mangle', min: 9, w: 2, text: 'From the back room, the mangle. Turning. It is not plugged in; you unplugged it yourself.', choices: [{ label: 'Close the door', eff: { sanity: -4 } }, { label: 'Go and look', eff: { sanity: -8, cash: 10, log: 'Went and looked at the mangle. There was a ten-dollar note in the rollers, pressed flat, this year\'s.' } }] },
  { id: 'okafor_bag', min: 8, w: 2, text: 'A bag of scrubs by Washer 1, Mrs Okafor\'s, blue, still damp. She has not been in tonight.', choices: [{ label: 'Dry them for her', eff: { power: -3, sanity: -2 } }, { label: 'Leave the bag', eff: { sanity: -1 } }] }
];

/* The line in the log you did not write, one per night. */
const UNWRITTEN = [
  'Floor dry at one. Good.', 'Four ran. Four always runs.', 'She knocked. You heard.', 'Second number is the right one.', 'The dryers like to be warm.', 'He knows what year it is now.',
  'The dark is only the dark.', 'Six is coming.', 'Exact change is a kindness.', 'The log is for the morning.', 'You were here. You were.', 'The floor remembers.', 'Thank you for unlocking.', 'Sixteen, then. Or fourteen. It does not matter.'
];

/* Endings. Chosen from totals across the fortnight, never from one choice. */
const ENDINGS = {
  spin: { title: 'Spin Cycle', text: 'You stop writing the log somewhere around three. The machines are all running. Nobody loaded them. You sit in the plastic chair by Dryer 2, which is warm, and you are still there when the day attendant comes in, and she says good morning, and you say good morning, and you both know you will not be going home.' },
  letgo: { title: 'Let Go', text: 'The owner\'s brother comes in at six with a face he has clearly practised. The drawer does not balance and has not for a while. "No hard feelings," Pat says, and takes the keys, and the sheet, and folds the sheet along the old folds, carefully, like something that will be needed again.' },
  attendant: { title: 'The Attendant', text: 'At six there is nobody at the register but you. You take the pencil. You add a rule, in your own hand, small, under the fourteen. It is a good rule. It will keep the next one safe, mostly. You put the keys on the register and the sheet under them and go out under the awning to wait, because you have been coming here longer than the machines.' },
  allnight: { title: 'Open All Night', text: 'You hand over the sheet at six without looking down, and go home, and sleep until two, and come back at eleven. Not because you have to. The drawer balances. The regulars know your name. Bea leaves two buns. The sheet has fourteen rules and you keep them all, every night, without reading them, the way you keep your own balance on a wet floor. It is a good job. It is survivable. You are good at it.' },
  dawn: { title: 'Dawn', text: 'You hand over the sheet. You do not look down. You walk across the car park with the sky going grey and the bakery light on and you do not look back at the awning, where someone is standing with a laundry bag in both arms. On Monday there is a different job, with a lunch hour. Some nights you dream of the hum dropping a semitone. On those nights you get up and check the floor is dry, and it is, and you go back to bed.' },
  closing: { title: 'Closing Time', text: 'Two weeks after your last night the laundromat closes. A notice on the door, apologies for the inconvenience, the nearest alternative is across town. You go past it once at eleven. The lights are off. The machines are running.' }
};

const DATA = { NIGHTS, FREE_NIGHTS, TICKS, TICK_MIN, PRICES, MACHINES, RULES, REGULARS, SPINE, MINOR, UNWRITTEN, ENDINGS };
if (typeof module !== 'undefined' && module.exports) module.exports = DATA; else root.LM_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
