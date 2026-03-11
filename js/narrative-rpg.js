(function () {
  'use strict';

  // —— Config: change these to design your world ——
  var TILE = 32;
  var MAP_W = 24;
  var MAP_H = 18;
  var PLAYER_SPEED = 120;  // pixels per second
  var STAT_NAMES = ['Strength', 'Cunning', 'Spirit'];
  var INITIAL_STATS = { Strength: 3, Cunning: 3, Spirit: 3 };
  var STAT_MAX = 5;

  // —— Map: 0 = floor, 1 = wall. Edit to build your level. ——
  var MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // —— Story scenes. Very long narrative with many branches and endings. ——
  var STORY = {
    start: {
      text: 'You wake in a small room at the Sign of the Oak. The fire has died to embers; the air is cold. Your head still aches from last night—you don\'t remember how you got here, only that you paid for a bed and a bottle.\n\nOn the table beside the bed: a note, unsealed. The handwriting is sharp, unfamiliar. "Meet me at the crossroads before the bell strikes noon. Come alone. Tell no one. — S"\n\nThrough the window you see a grey morning. Smoke rises from a dozen chimneys. The town is already stirring: carts on the street, voices from the market. The bell will ring soon enough.',
      choices: [
        { text: 'Read the note again and dress.', next: 'start2' },
        { text: 'Look around the room carefully.', next: 'look_room' },
        { text: 'Check the window—who\'s outside?', next: 'look_window' },
        { text: 'Leave at once.', next: 'outside' }
      ]
    },
    start2: {
      text: 'You read the note again. Crossroads. Noon. Alone. The "S" could be anyone—a name, a title, a joke. But the silver that paid for your room last night was real. So is the feeling that something is expected of you.\n\nYou fold the note into your pocket and pull on your coat. The inn is quiet below. You hear the clink of a single cup, the scrape of a chair. You take a breath and open the door.',
      choices: [
        { text: 'Go downstairs.', next: 'downstairs' },
        { text: 'Sneak out the window.', next: 'out_window', statChange: { stat: 'Cunning', delta: 1 } }
      ]
    },
    look_window: {
      text: 'You lean close to the glass. The street below is narrow, mostly empty. A woman with a basket hurries past. Two men in work clothes stand at the corner, talking. Neither looks up. No one seems to be watching the inn. Either "S" is very good, or you\'re not that important. Yet.',
      choices: [
        { text: 'Turn back to the room.', next: 'look_room' },
        { text: 'Take the note and go.', next: 'outside' }
      ]
    },
    look_room: {
      text: 'The room is sparse: a narrow bed, a small table, a washbasin with yesterday\'s water. You kneel and look under the bed. A worn blade in a leather sheath—not yours. You leave it; you\'ve never been one for steel.\n\nIn the drawer of the table: dust, a single copper, and a scrap of cloth with a stain that might be blood. Nothing that explains the note. Someone wanted you in this room. Someone wants you at the crossroads.',
      choices: [
        { text: 'Take the note and go.', next: 'outside' },
        { text: 'Take the blade after all.', next: 'take_blade', statChange: { stat: 'Strength', delta: 1 } },
        { text: 'Search the drawer again.', next: 'look_drawer' }
      ]
    },
    look_drawer: {
      text: 'You empty the drawer. Under the cloth you find a second scrap, folded small. Unfolding it, you see a single word: "Sparrow." No context. You pocket it with the note. Maybe it means something. Maybe it\'s a trap. You won\'t know until you move.',
      choices: [
        { text: 'Leave the room.', next: 'outside' },
        { text: 'Take the blade too.', next: 'take_blade', statChange: { stat: 'Strength', delta: 1 } }
      ]
    },
    take_blade: {
      text: 'The weight of the blade at your belt is unfamiliar but not unwelcome. You slip the note—and the Sparrow scrap, if you have it—into your pocket and step out into the corridor. The hall is dim; doors line both sides. Somewhere a floorboard creaks.',
      choices: [
        { text: 'Go downstairs.', next: 'downstairs' },
        { text: 'Go straight outside.', next: 'outside' }
      ]
    },
    downstairs: {
      text: 'The stairs bring you to the common room. A handful of tables, a cold hearth, the smell of old beer. The innkeeper wipes a tankard behind the bar. In the corner, one patron sits alone, head in his hands. No one else. The door to the street stands open; grey light spills in.',
      choices: [
        { text: 'Nod to the innkeeper and leave.', next: 'outside' },
        { text: 'Talk to the innkeeper.', next: 'npc_innkeeper' },
        { text: 'Approach the patron in the corner.', next: 'patron_corner' }
      ]
    },
    out_window: {
      text: 'You ease the window open and drop into the alley beside the inn. No one sees you. You brush yourself off and slip into the street. The crossroads lie north. You\'ve bought yourself a little time—and maybe no one at the Oak will know you\'re gone.',
      choices: [
        { text: 'Go to the crossroads.', next: 'crossroads' },
        { text: 'Walk through the market first.', next: 'market' }
      ]
    },
    patron_corner: {
      text: 'The man looks up. Red eyes, unshaven. "You." He laughs softly. "You\'re the one with the note. I saw them leave it. Didn\'t see a face—hood, cloak. Paid the keeper to put it on your table." He leans in. "My advice? Don\'t go. Whatever they want, it\'s trouble."',
      choices: [
        { text: "I'll go. Thanks anyway.", next: 'outside' },
        { text: "What do you know about the Sparrow?", next: 'patron_sparrow' },
        { text: 'Leave without answering.', next: 'outside' }
      ]
    },
    patron_sparrow: {
      text: 'He sobers a little. "Ship. Smuggler, some say. The Crown wants her. Others say she\'s the only one who pays honest for honest work." He shrugs. "I don\'t know nothing. Just—if you\'re going to the crossroads, go with your eyes open."',
      choices: [
        { text: 'Leave the inn.', next: 'outside' }
      ]
    },
    outside: {
      text: 'The street is cold and damp. To the north, the road climbs toward the crossroads—where the old gallows used to stand, before the Crown decided hanging was bad for trade. To the east, you can smell the salt and hear the gulls. The docks. Between here and there, the market square is already busy: carts, voices, the first sellers setting out their wares.\n\nYou have time before noon. Not much. You could go straight to the meeting, or learn a little more first.',
      choices: [
        { text: 'Go straight to the crossroads.', next: 'road_crossroads' },
        { text: 'Walk through the market first.', next: 'market' },
        { text: 'Take the alley—faster, but rougher.', next: 'alley', statChange: { stat: 'Cunning', delta: 1 } },
        { text: 'Go to the docks first. See who\'s about.', next: 'docks_early', statChange: { stat: 'Cunning', delta: 1 } }
      ]
    },
    road_crossroads: {
      text: 'You take the main road north. The cobbles give way to dirt; the buildings thin out. You pass a smithy, a closed chapel, then open land. The crossroads is a bare patch ahead—old stones, a broken post where the gallows once stood. The wind picks up. No one in sight yet.',
      choices: [
        { text: 'Wait at the crossroads.', next: 'crossroads' },
        { text: 'Turn back and go to the market first.', next: 'market' }
      ]
    },
    alley: {
      text: 'You slip into the alley between the cooper\'s and the chandlery. It\'s narrow, shadowed. Halfway through you hear voices—a deal going wrong. You press against the wall. Two figures argue over a crate; one draws a knife. You wait. They don\'t see you. When they leave, you breathe again and emerge on the far side. You know the streets a little better now.',
      choices: [
        { text: 'Continue to the crossroads.', next: 'crossroads' },
        { text: 'Cut through to the market.', next: 'market' }
      ]
    },
    market: {
      text: 'The market is a press of bodies and barter. You buy a heel of bread and a cup of small beer, and you listen. Talk is everywhere: the harvest, the tax collector, a missing child. But again and again you hear the same thread—a ship. The Sparrow. Due in on the tide. Someone says the Crown has posted a reward for word of her. Someone else says the Sparrow pays better and asks fewer questions. You finish the bread and slip away.',
      choices: [
        { text: 'Head to the crossroads.', next: 'crossroads' },
        { text: 'Eavesdrop a little longer.', next: 'market_rumors' },
        { text: 'Go to the docks and look for the Sparrow.', next: 'docks_detour' },
        { text: 'Talk to the guard at the edge of the square.', next: 'guard_market' }
      ]
    },
    market_rumors: {
      text: 'You drift from stall to stall. A fishwife complains about the harbour master. A merchant in a fine coat mutters about "cargo" and "customs." You catch a name—Sparrow—and something about "the warehouse by the old pier." A man in Crown colours passes; the talk dies. You\'ve heard enough.',
      choices: [
        { text: 'Go to the crossroads.', next: 'crossroads' },
        { text: 'Go to the docks.', next: 'docks_detour' }
      ]
    },
    guard_market: {
      text: 'The guard leans on his spear. "Market\'s open. Move along." You ask about the crossroads. He eyes you. "Nothing there anymore. Just dirt and ghosts. Why?" You say you\'re meeting someone. He snorts. "Your business. Don\'t cause trouble." He doesn\'t know about the Sparrow—or he\'s not saying.',
      choices: [
        { text: 'Leave for the crossroads.', next: 'crossroads' },
        { text: 'Leave for the docks.', next: 'docks_detour' }
      ]
    },
    crossroads: {
      text: 'The crossroads is a bare patch of dirt and old stones. Weeds grow between the cracks. You wait. The wind picks up; somewhere a dog barks.\n\nA figure steps out from behind the ruined post. Dark cloak, face in shadow. The voice is low, deliberate. "You came. Good." They hold out a sealed letter. "This goes to the Sparrow. The docks—ask for the Sparrow. No questions. No reading it. Deliver it before sundown and you\'ll be paid. Refuse, and we forget we ever met. I have other messengers."',
      choices: [
        { text: 'Take the letter.', next: 'have_letter', statChange: { stat: 'Spirit', delta: 1 } },
        { text: "I want payment upfront.", next: 'payment', statCheck: { stat: 'Cunning', min: 4 } },
        { text: "Who's the letter from? What's in it?", next: 'ask_more' },
        { text: "Why me? Why this inn?", next: 'ask_why' },
        { text: 'Refuse. Walk away.', next: 'refuse' }
      ]
    },
    ask_more: {
      text: 'The figure goes very still. "That\'s none of your concern. You\'re a messenger. Act like one." The letter stays extended. "Take it, or don\'t. I have other options. But you were chosen for a reason. Don\'t waste it."',
      choices: [
        { text: 'Take the letter.', next: 'have_letter' },
        { text: 'Refuse.', next: 'refuse' }
      ]
    },
    ask_why: {
      text: '"Because you were there. Because you need coin. Because you don\'t ask questions." A pause. "We had someone else. They asked too many. You don\'t want to be them." The letter is still in their hand. "Last chance."',
      choices: [
        { text: 'Take the letter.', next: 'have_letter' },
        { text: 'Refuse.', next: 'refuse' }
      ]
    },
    have_letter: {
      text: 'You take the letter. It\'s heavier than it looks—good paper, a real seal. You don\'t recognize the signet. The figure nods. "Docks. The Sparrow. Before sundown. If you\'re late, the deal is off and we find you." They step back into the shadow of the post. When you look again, they\'re gone.\n\nThe docks lie east. You still have time. The letter burns in your pocket.',
      choices: [
        { text: 'Go straight to the docks.', next: 'road_docks' },
        { text: 'Open the letter first.', next: 'read_letter', statCheck: { stat: 'Cunning', min: 3 } },
        { text: 'Stop at the market to think.', next: 'market' }
      ]
    },
    road_docks: {
      text: 'You take the east road. The smell of salt grows. Gulls wheel overhead. The docks are a tangle of masts and rope ahead. You walk quickly but not so fast that you draw eyes. The letter stays in your coat. You don\'t touch it.',
      choices: [
        { text: 'Go to the docks.', next: 'docks' },
        { text: 'Open the letter before you arrive.', next: 'read_letter', statCheck: { stat: 'Cunning', min: 3 } }
      ]
    },
    read_letter: {
      text: 'You find a corner out of the wind and break the seal. The message is short. "The cargo is ready. Burn the warehouse if you must. No witnesses. — S." Your stomach turns. Burn the warehouse. No witnesses. You reseal it as best you can—the wax is ruined but maybe she won\'t look close. Delivering this could make you part of something ugly. But not delivering it might be worse. S had "other options."',
      choices: [
        { text: 'Deliver it anyway. You\'re just the messenger.', next: 'docks' },
        { text: 'Rip it up. You want no part of this.', next: 'destroy_letter', statChange: { stat: 'Spirit', delta: 1 } },
        { text: 'Deliver it but try to warn the Sparrow.', next: 'docks_warn_intent' }
      ]
    },
    destroy_letter: {
      text: 'You tear the letter into pieces and scatter them in the wind. Whatever game "S" is playing, you\'re out. You walk back toward town. Your hands are shaking. You don\'t look back. Maybe they\'ll find another messenger. Maybe they\'ll find you. Either way, you won\'t carry that.',
      choices: [
        { text: 'Return to the market.', next: 'market' },
        { text: 'Go to the docks anyway—warn someone.', next: 'docks_warn' },
        { text: 'Leave town. Now.', next: 'flee_town' }
      ]
    },
    flee_town: {
      text: 'You don\'t go back to the inn. You don\'t go to the market. You take the west road out of town and you walk. By nightfall you\'re in the next valley. You find work on a farm. You never hear what happened to the warehouse, or to S, or to the Sparrow. Sometimes you wonder. Mostly you\'re glad you ran.',
      choices: [
        { text: 'The end.', next: 'end_flee' }
      ]
    },
    end_flee: {
      text: 'You built a life elsewhere. The crossroads, the letter, the Sparrow—they fade. You keep your head down. You sleep at night. It\'s enough.',
      choices: [
        { text: 'Play again.', next: 'start' }
      ]
    },
    docks_warn_intent: {
      text: 'You\'ll deliver the letter—you have to, or they\'ll know something\'s wrong—but you\'ll find a way to warn the Sparrow. Maybe she can burn the cargo and run. Maybe it\'s already too late. You fold the damaged letter into your pocket and head east.',
      choices: [
        { text: 'Go to the docks.', next: 'docks' }
      ]
    },
    docks_warn: {
      text: 'At the docks you ask for the Sparrow. A weathered sailor eyes you. "You\'re too late. She sailed on the morning tide." He nods toward the horizon. "Whatever you had for her—it\'s gone." You say nothing about the letter, or the warehouse, or S. Maybe it\'s better that way. Maybe the cargo never moved. Maybe it did. You\'ll never know.',
      choices: [
        { text: 'Stay at the docks a while.', next: 'docks_stay' },
        { text: 'Leave. You\'re done with this.', next: 'end_walk' }
      ]
    },
    payment: {
      text: 'The figure pauses. Then something like a laugh. "Smart. I like that." A small purse lands in your palm. Heavy. "Half now. Half when the Sparrow has the letter. Docks. Ask for her by name. Don\'t disappoint me—or we\'ll have words." They step back. "Go." They\'re gone before you can answer.',
      choices: [
        { text: 'Go to the docks.', next: 'road_docks' }
      ]
    },
    refuse: {
      text: 'You shake your head. "I\'m not your courier." The figure doesn\'t move. For a moment you think they\'ll argue—or worse. Then: "Then we\'re done. Forget this. Forget me. And hope I forget you." You walk back the way you came. The wind feels colder. You don\'t run. You don\'t look back.',
      choices: [
        { text: 'Go to the market.', next: 'market' },
        { text: 'Go to the docks anyway.', next: 'docks_detour' },
        { text: 'Go back to the inn.', next: 'downstairs' }
      ]
    },
    docks_early: {
      text: 'The docks are loud: ropes, crates, sailors shouting in three languages. You ask after the Sparrow. A dockhand spits. "She ain\'t in yet. Tide\'s not right. Try again later—or tomorrow." You wander a while. You see the warehouse the market gossip mentioned: old pier, peeling paint. You don\'t go close. You head back toward town. The crossroads might have answers.',
      choices: [
        { text: 'Go to the crossroads.', next: 'crossroads' },
        { text: 'Go to the market.', next: 'market' }
      ]
    },
    docks_detour: {
      text: 'You reach the docks before going to the crossroads. Nets hang from the rigging; the smell of fish and tar is thick. You ask a few questions—carefully. The Sparrow is expected. Maybe today. Maybe tomorrow. No one will say more. You leave before you\'re remembered, and make for the crossroads. At least now you know the lay of the land.',
      choices: [
        { text: 'Go to the crossroads.', next: 'crossroads' }
      ]
    },
    docks: {
      text: 'The docks at the end of the day: fewer people, longer shadows. You ask for the Sparrow. A woman in a salt-stained coat turns. She has the look of someone who\'s been at sea for years. "That\'s me. You have something for me?" She looks at the letter in your hand. "From S. Good." She takes it. Doesn\'t open it. "You kept your word. So will we." She nods toward a small boat, ready to cast off. "We can use people who don\'t ask questions. Who deliver. Want to come? Or take your pay and go."',
      choices: [
        { text: 'Board the Sparrow.', next: 'end_boat' },
        { text: "I'm done. Just pay me.", next: 'end_paid' },
        { text: 'Not this time. Maybe later.', next: 'end_decline' },
        { text: "Wait—I need to tell you something about the letter.", next: 'sparrow_warn' }
      ]
    },
    sparrow_warn: {
      text: 'You tell her what was in the letter. The cargo. The warehouse. Burn it if you must. No witnesses. She listens. Her face doesn\'t change. "I know. S and I have an understanding. The letter was the signal." She tucks it away. "You didn\'t have to say. That means something. So: still want to come? Or take your pay and walk. Your choice."',
      choices: [
        { text: 'Board the Sparrow.', next: 'end_boat' },
        { text: "I'll take the pay.", next: 'end_paid' },
        { text: 'I need to go.', next: 'end_decline' }
      ]
    },
    docks_stay: {
      text: 'You spend the rest of the day on the docks. You watch the horizon. The Sparrow doesn\'t return. Whatever was in that letter, whatever S planned—it\'s someone else\'s problem now. At dusk you find a cheap room in a sailors\' lodge. You sleep fitfully. In the morning you decide: stay or leave. You leave.',
      choices: [
        { text: 'The end.', next: 'end_walk' }
      ]
    },
    end_boat: {
      text: 'You step aboard. The Sparrow casts off. The town shrinks behind you—the inn, the market, the crossroads, all of it. The woman—the Sparrow—stands at the tiller. "Where we\'re going, the Crown doesn\'t reach. You\'ll earn your keep. You\'ll see things. Some of them you\'ll wish you hadn\'t. But you\'ll be free." The sea opens ahead. The sun sets. Your story is just beginning.',
      choices: [
        { text: 'Continue.', next: 'chapter2_sail' }
      ]
    },
    chapter2_sail: {
      text: 'The first night at sea. You help with the lines; your hands learn the ropes. The Sparrow doesn\'t say much. Around midnight she nods at the horizon. "We run for the Free Isles. No Crown there. No S—not yet. You delivered the letter. That makes you useful. Next port, there\'s a pickup. You\'ll come. Watch, listen, don\'t ask." She hands you a waterskin. "Get some sleep. Tomorrow we work."',
      choices: [
        { text: 'Sleep. Tomorrow comes.', next: 'chapter2_port' }
      ]
    },
    chapter2_port: {
      text: 'Dawn brings a ragged coast—hidden coves, no flags. The Sparrow anchors in a bay. "Stay close. We meet a contact. You watch my back. If anything goes wrong, run for the boat." You go ashore. A figure steps from the trees. Not S. Someone else—armed, wary. The Sparrow raises a hand. "Easy. This one\'s with me." The contact eyes you. "New blood?" "They delivered. That\'s enough." A crate changes hands. No one smiles. Back on the boat, the Sparrow stows the cargo. "You did fine. Next time you might have to do more than watch."',
      choices: [
        { text: "What kind of 'more'?", next: 'chapter2_more' },
        { text: "I'll be ready.", next: 'chapter2_end' }
      ]
    },
    chapter2_more: {
      text: '"Whatever it takes. S has enemies. So do we. Sometimes that means running. Sometimes it means standing." She checks the tiller. "You chose the boat. So you\'re in. No going back to that town—not as you left it. But you\'ve got a crew now. A share of the take. And a long way to go." She almost smiles. "Get some rest. The Free Isles are three days. After that—we\'ll see."',
      choices: [
        { text: 'Rest. The story goes on.', next: 'chapter2_end' }
      ]
    },
    chapter2_end: {
      text: 'You lean against the rail. The coast slips away. The Sparrow hums something old—a sailing song. You don\'t know the words yet. You will. The sea is wide. The Crown is far. Three days to the Free Isles. Then the real work begins.',
      choices: [
        { text: 'Continue.', next: 'chapter3_arrival' }
      ]
    },
    chapter3_arrival: {
      text: 'The Free Isles rise out of the mist: steep cliffs, wooden piers, no Crown colours anywhere. "Welcome to Salt Haven," the Sparrow says. "Don\'t expect a parade. We\'re not the only runners here—play nice, pay your share, and nobody asks your name." You tie up. The harbour is loud: traders, fighters, people who don\'t look back. She leads you to a tavern. "We rest tonight. Tomorrow I have a meeting. You come. After that, you\'ll have earned your first real share."',
      choices: [
        { text: 'Rest. Tomorrow you work.', next: 'chapter3_tavern' },
        { text: "I want to look around first.", next: 'chapter3_look', statChange: { stat: 'Cunning', delta: 1 } }
      ]
    },
    chapter3_look: {
      text: 'You walk the harbour. You hear accents from half a dozen coasts. Someone mentions the Crown—a patrol sunk, no survivors. Someone else talks about S: "Still pulling strings. Pays in silver and silence." You don\'t ask. You slip back to the tavern. The Sparrow has a corner table. "Learn anything useful?" You shrug. She nods. "Good. Curiosity\'s fine. Loose lips sink ships."',
      choices: [
        { text: 'Rest. Tomorrow you work.', next: 'chapter3_tavern' }
      ]
    },
    chapter3_tavern: {
      text: 'You eat. You drink. The Sparrow talks in low tones with a scarred woman who leaves before dawn. "Old friend. She had news. The Crown\'s sending a ship—not for us, not yet. But the waters are getting warm." She pushes a key across the table. "Room upstairs. Get some sleep. Tomorrow we meet a man. He has a package. We take it north. Simple." She doesn\'t say what\'s in the package. You don\'t ask.',
      choices: [
        { text: 'Sleep.', next: 'chapter4_meeting' }
      ]
    },
    chapter4_meeting: {
      text: 'Morning. The Sparrow leads you to a warehouse at the edge of the harbour. Inside: a man in a fine coat, two guards. "The Sparrow. And the new one." He looks you over. "Can they be trusted?" "They delivered for S. That\'s my word." The man nods. A sealed chest is carried to the boat. "North. The usual drop. No delays." As you leave, the Sparrow says quietly, "If this goes wrong, we run. The chest stays. We don\'t. Understood?"',
      choices: [
        { text: 'Understood.', next: 'chapter4_sail' },
        { text: "What's in the chest?", next: 'chapter4_ask' }
      ]
    },
    chapter4_ask: {
      text: '"Nothing we need to know. Papers. Gold. Someone\'s secrets. Our job is to move it. The less we know, the less we can tell." She checks the horizon. "You asked once. Don\'t ask again. Not out here."',
      choices: [
        { text: 'Understood. North.', next: 'chapter4_sail' }
      ]
    },
    chapter4_sail: {
      text: 'Two days north. The weather holds. On the second afternoon, a sail appears behind you—fast, closing. The Sparrow\'s face goes hard. "Crown cutter. Or someone who wants to look like one." She throws you a blade. "Hope you remember how to use that. Or how to swim." The gap shrinks. They\'re not signalling. They\'re chasing.',
      choices: [
        { text: 'Stand with her. We fight or we run together.', next: 'chapter4_chase', statChange: { stat: 'Spirit', delta: 1 } },
        { text: 'Can we outrun them?', next: 'chapter4_run', statChange: { stat: 'Cunning', delta: 1 } }
      ]
    },
    chapter4_chase: {
      text: '"Then we run." She puts the tiller over. The Sparrow is quick—you learned that much. She cuts toward a chain of rocks, shallow water. The cutter follows. Too fast. You hear the scrape of their hull on stone; shouts. They\'re stuck. The Sparrow doesn\'t look back. "Lucky. Next time we might not be." You breathe. Your hands are shaking. She nods. "You didn\'t jump. That counts."',
      choices: [
        { text: 'Continue north.', next: 'chapter5_drop' }
      ]
    },
    chapter4_run: {
      text: '"We try." She trims the sail. The wind is with you. The Sparrow knows these waters—every current, every eddy. She takes you through a gap you didn\'t see. The cutter loses you in the haze. By nightfall there\'s nothing behind. "Good eye. Asking the right question." She allows something like a smile. "North. We deliver. Then we drink."',
      choices: [
        { text: 'Continue north.', next: 'chapter5_drop' }
      ]
    },
    chapter5_drop: {
      text: 'The drop is a cove on a deserted coast. A fire burns on the beach—one figure. The Sparrow rows the chest ashore. Words are exchanged. The figure hands her a purse. You watch from the boat. When she returns, she tosses you a coin. "Your share. You earned it." She looks at the horizon. "S will hear we delivered. That means more work. Or we lay low a while. Your choice—you\'re crew now. What do you want?"',
      choices: [
        { text: "More work. I'm in.", next: 'chapter5_more' },
        { text: "Let's lay low. I need to breathe.", next: 'chapter5_low' }
      ]
    },
    chapter5_more: {
      text: '"Good." She pockets the purse. "Next run\'s in a week. Until then we rest, we repair, we don\'t draw attention. You\'ve got a bunk, a share, and a long road ahead. Welcome to the Sparrow." The fire on the beach dwindles. You turn the boat toward the open sea. The Crown is far. S is a voice in the dark. You have a crew. You have a place. Your story is just beginning.\n\n— To be continued —',
      choices: [
        { text: 'Play again from the start.', next: 'start' }
      ]
    },
    chapter5_low: {
      text: '"Smart. Sometimes the best move is to disappear." She finds a quiet anchorage. You rest. No runs for a month. You mend nets, you fish, you learn the songs. When the Sparrow finally says "We go again," you\'re ready. You\'ve got a bunk, a share, and a long road ahead. Welcome to the Sparrow. Your story is just beginning.\n\n— To be continued —',
      choices: [
        { text: 'Play again from the start.', next: 'start' }
      ]
    },
    end_paid: {
      text: 'She counts out the rest of your pay. Coin by coin. "As agreed. If you change your mind, ask for me. I remember people who hold their word." You pocket the money. The boat slips away. You stand on the dock until it\'s a speck. You\'re free. You have coin. You have no master. For now, that\'s enough.',
      choices: [
        { text: 'Play again.', next: 'start' }
      ]
    },
    end_decline: {
      text: '"Suit yourself." She tucks the letter away. "If you ever need passage—or work—you know where to find me. The Sparrow. We don\'t forget." The boat pulls away. You stand on the dock until it\'s a speck. Then you walk back into town. Some doors stay open. You might knock one day. Or not.',
      choices: [
        { text: 'Play again.', next: 'start' }
      ]
    },
    end_walk: {
      text: 'You leave the docks and the letter and the Sparrow behind. Some days the only winning move is not to play. You find work in another town—honest work, or close enough. The crossroads, the cloak, the seal—they fade into memory. You hear rumours sometimes. A fire at a warehouse. A ship that never came back. You don\'t ask. You never learn what happened to S. Maybe that\'s for the best.',
      choices: [
        { text: 'Play again.', next: 'start' }
      ]
    },
    npc_innkeeper: {
      text: 'The innkeeper wipes a tankard. "You\'re the one from the upstairs room. Slept late." He leans in, voice low. "Someone left that note. Didn\'t see a face—hood, cloak. Paid in silver to have it on your table. Good silver. I don\'t ask questions. You shouldn\'t either. Strange times. Keep your wits about you."',
      choices: [
        { text: 'Thanks.', next: '_close' },
        { text: "Anyone else asking after me?", next: 'npc_innkeeper2' },
        { text: "What did they look like?", next: 'npc_innkeeper3' }
      ]
    },
    npc_innkeeper2: {
      text: '"Not yet. But the Crown\'s got eyes on the docks. Reward for word of some ship—the Sparrow. I don\'t ask. You shouldn\'t either. Deliver your message, take your coin, and move on." He goes back to his wiping.',
      choices: [
        { text: 'Thanks.', next: '_close' }
      ]
    },
    npc_innkeeper3: {
      text: '"Average height. Dark clothes. Voice was quiet—could\'ve been man or woman. They knew your name. Or the room. Same thing, I suppose." He shrugs. "That\'s all. Now—you staying for breakfast or heading out?"',
      choices: [
        { text: 'Heading out.', next: '_close' },
        { text: "One more thing—the Sparrow?", next: 'npc_innkeeper2' }
      ]
    },
    npc_stranger: {
      text: 'The figure in the cloak watches you approach. "You have the letter. The Sparrow is at the docks. Deliver it before sundown. No questions. No reading. No delays." Their hand rests inside their coat. "Do we understand each other? S doesn\'t like to be disappointed."',
      choices: [
        { text: 'Yes.', next: '_close' },
        { text: 'What if I don\'t?', next: 'npc_stranger_refuse' },
        { text: "What's in the letter?", next: 'npc_stranger_letter' }
      ]
    },
    npc_stranger_refuse: {
      text: '"Then we never met. But S has a long memory. Don\'t make an enemy you don\'t need. There are other towns. Other messengers. We\'ll find one." They step back. The conversation is over.',
      choices: [
        { text: 'Leave.', next: '_close' }
      ]
    },
    npc_stranger_letter: {
      text: '"Nothing that concerns you. Cargo. Instructions. The kind of thing that gets people killed if they read it. So don\'t." Their tone is flat. "Take it to the Sparrow. That\'s the job."',
      choices: [
        { text: 'Understood.', next: '_close' },
        { text: 'What if I\'m late?', next: 'npc_stranger_refuse' }
      ]
    },
    npc_merchant: {
      text: 'The merchant eyes your coat. "Traveler? I\'ve got good rope, dried fish, a blade or two. Fair prices." He lowers his voice. "Heard you might be looking for a ship. The Sparrow\'s in port—or will be. Ask at the end of the pier. Look for the red buoy. And don\'t say I sent you. I like my head where it is."',
      choices: [
        { text: 'Thanks for the tip.', next: '_close' },
        { text: "What do you know about the Sparrow?", next: 'npc_merchant2' },
        { text: "Why the Crown's interest?", next: 'npc_merchant3' }
      ]
    },
    npc_merchant2: {
      text: '"Enough to know she pays on time and doesn\'t ask where the cargo came from. Some say she works for the rebellion. Some say she\'s just smart. Runs blockades. Knows the coast. I say keep your head down and your purse closed. Do the job, take the coin, don\'t ask."',
      choices: [
        { text: 'Understood.', next: '_close' },
        { text: "And the warehouse by the old pier?", next: 'npc_merchant3' }
      ]
    },
    npc_merchant3: {
      text: '"I didn\'t say nothing about no warehouse." He looks around. "Listen. Things get stored. Things get moved. The Crown doesn\'t like it. The Sparrow doesn\'t care. You\'re in the middle. So move. Fast."',
      choices: [
        { text: 'Thanks.', next: '_close' }
      ]
    },
    npc_sailor: {
      text: 'The sailor squints at you. "Looking for someone? The Sparrow? She\'s due. Could be an hour, could be tomorrow. Tide and wind—they don\'t care about your schedule." He spits. "If you\'re carrying something for her, wait by the red buoy. She sends a skiff. Don\'t wave at every boat. You\'ll look like a fool."',
      choices: [
        { text: 'Thanks.', next: '_close' },
        { text: "What does she look like?", next: 'npc_sailor2' },
        { text: "Who else is looking for her?", next: 'npc_sailor3' }
      ]
    },
    npc_sailor2: {
      text: '"Salt-stained coat. Short hair. Eyes that\'ve seen too much. You\'ll know her when you see her. She doesn\'t hide. Doesn\'t need to. Not here."',
      choices: [
        { text: 'Thanks.', next: '_close' }
      ]
    },
    npc_sailor3: {
      text: '"Crown\'s got a reward. Harbour master\'s got questions. So do the customs men. So if you\'re working for her, keep it quiet. We don\'t talk to strangers. Usually." He grunts. "You seem all right. Don\'t prove me wrong."',
      choices: [
        { text: 'I won\'t.', next: '_close' }
      ]
    }
  };

  // —— NPCs: tile x, y and scene id when you press E nearby ——
  var NPCS = [
    { tx: 3, ty: 4, sceneId: 'npc_innkeeper' },
    { tx: 14, ty: 8, sceneId: 'npc_stranger' },
    { tx: 6, ty: 6, sceneId: 'npc_merchant' },
    { tx: 20, ty: 10, sceneId: 'npc_sailor' }
  ];

  // —— Triggers: enter tile (tx, ty) to auto-show a scene once. Set sceneId and triggerId. ——
  var TRIGGERS = [
    { tx: 2, ty: 2, sceneId: 'start', triggerId: 'entered_room' }
  ];

  var canvas, ctx;
  var player = { x: 0, y: 0, dir: 0 };
  var state = {
    sceneId: null,
    stats: {},
    keys: {},
    triggered: {},
    dialogueOpen: false
  };
  var lastTime = 0;
  var animId = 0;

  function worldToScreen(x, y) {
    var cw = canvas.width;
    var ch = canvas.height;
    var camX = player.x - cw / 2;
    var camY = player.y - ch / 2;
    return { x: x - camX, y: y - camY };
  }

  function tileToPixel(tx, ty) {
    return {
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2
    };
  }

  function pixelToTile(px, py) {
    return {
      tx: Math.floor(px / TILE),
      ty: Math.floor(py / TILE)
    };
  }

  function isWall(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return MAP[ty][tx] === 1;
  }

  function movePlayer(dx, dy, dt) {
    var speed = PLAYER_SPEED * dt / 1000;
    var half = TILE / 2 - 3;
    var nx = player.x + dx * speed;
    var ny = player.y + dy * speed;
    function anyCornerInWall(cx, cy) {
      var corners = [
        [cx - half, cy - half], [cx + half, cy - half],
        [cx - half, cy + half], [cx + half, cy + half]
      ];
      for (var i = 0; i < corners.length; i++) {
        var t = pixelToTile(corners[i][0], corners[i][1]);
        if (isWall(t.tx, t.ty)) return true;
      }
      return false;
    }
    if (!anyCornerInWall(nx, player.y)) player.x = nx;
    if (!anyCornerInWall(player.x, ny)) player.y = ny;
  }

  function showError(msg) {
    var el = document.getElementById('load-msg');
    if (el) {
      el.style.display = '';
      el.style.color = '#e08080';
      el.textContent = msg;
    }
  }

  function init() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
      showError('Canvas not found.');
      return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
      showError('Could not get 2D context.');
      return;
    }
    resizeCanvas();

    STAT_NAMES.forEach(function (name) {
      state.stats[name] = INITIAL_STATS[name] != null ? INITIAL_STATS[name] : 3;
    });

    // Start position (tile 2,2 in pixels)
    var start = tileToPixel(2, 2);
    player.x = start.x;
    player.y = start.y;

    // Open start dialogue once
    state.triggered = {};
    showDialogue('start');

    renderHud();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    lastTime = performance.now();
    tick(lastTime);
    var loadMsg = document.getElementById('load-msg');
    if (loadMsg) loadMsg.style.display = 'none';
  }

  function resizeCanvas() {
    if (!canvas) return;
    var wrap = document.getElementById('game-wrap');
    var w = wrap ? wrap.clientWidth : 0;
    var h = wrap ? wrap.clientHeight : 0;
    if (w <= 0 || h <= 0) { w = window.innerWidth; h = window.innerHeight; }
    if (w <= 0) w = MAP_W * TILE;
    if (h <= 0) h = MAP_H * TILE;
    var scale = Math.min(w / (MAP_W * TILE), h / (MAP_H * TILE), 2);
    if (scale <= 0) scale = 1;
    var cw = Math.max(320, Math.floor(MAP_W * TILE * scale));
    var ch = Math.max(240, Math.floor(MAP_H * TILE * scale));
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
  }

  function onKeyDown(e) {
    var k = e.key.toLowerCase();
    state.keys[k] = true;
    if (state.dialogueOpen) return;
    if (k === 'e') tryInteract();
    e.preventDefault();
  }

  function onKeyUp(e) {
    state.keys[e.key.toLowerCase()] = false;
  }

  function tryInteract() {
    var pt = pixelToTile(player.x, player.y);
    var near = 1.2;
    for (var i = 0; i < NPCS.length; i++) {
      var n = NPCS[i];
      var dx = n.tx - pt.tx;
      var dy = n.ty - pt.ty;
      if (dx * dx + dy * dy <= near * near) {
        showDialogue(n.sceneId);
        return;
      }
    }
  }

  function checkTriggers() {
    if (state.dialogueOpen) return;
    var pt = pixelToTile(player.x, player.y);
    for (var i = 0; i < TRIGGERS.length; i++) {
      var t = TRIGGERS[i];
      if (t.tx === pt.tx && t.ty === pt.ty && !state.triggered[t.triggerId]) {
        state.triggered[t.triggerId] = true;
        showDialogue(t.sceneId);
        return;
      }
    }
  }

  function showDialogue(sceneId) {
    var scene = STORY[sceneId];
    if (!scene) return;
    var textEl = document.getElementById('dialogue-text');
    var choicesEl = document.getElementById('dialogue-choices');
    var overlayEl = document.getElementById('dialogue-overlay');
    if (!textEl || !choicesEl || !overlayEl) return;
    state.dialogueOpen = true;
    state.sceneId = sceneId;
    textEl.textContent = scene.text;
    choicesEl.innerHTML = '';
    (scene.choices || []).forEach(function (choice) {
      var allowed = !choice.statCheck || (state.stats[choice.statCheck.stat] != null && state.stats[choice.statCheck.stat] >= choice.statCheck.min);
      var btn = document.createElement('button');
      btn.textContent = choice.text;
      if (!allowed) { btn.disabled = true; btn.classList.add('disabled'); }
      else {
        if (choice.next === '_close') btn.classList.add('continue');
        btn.addEventListener('click', function () {
          if (choice.statChange) {
            var s = choice.statChange.stat;
            var v = state.stats[s];
            if (v !== undefined)
              state.stats[s] = Math.max(0, Math.min(STAT_MAX, v + (choice.statChange.delta || 0)));
            renderHud();
          }
          if (choice.next === '_close') {
            closeDialogue();
          } else {
            showDialogue(choice.next);
          }
        });
      }
      choicesEl.appendChild(btn);
    });
    overlayEl.classList.add('visible');
  }

  function closeDialogue() {
    state.dialogueOpen = false;
    document.getElementById('dialogue-overlay').classList.remove('visible');
  }

  function renderHud() {
    var el = document.getElementById('hud');
    if (!el) return;
    el.innerHTML = '';
    STAT_NAMES.forEach(function (name) {
      var v = state.stats[name];
      var pct = Math.max(0, Math.min(100, (v / STAT_MAX) * 100));
      var div = document.createElement('div');
      div.className = 'stat';
      div.innerHTML =
        '<span class="stat-name">' + name + '</span>' +
        '<div class="stat-bar"><div class="stat-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="stat-value">' + v + '</span>';
      el.appendChild(div);
    });
  }

  function tick(now) {
    var dt = Math.min(now - lastTime, 100);
    lastTime = now;

    if (!state.dialogueOpen) {
      var dx = 0, dy = 0;
      if (state.keys['arrowleft'] || state.keys['a']) dx -= 1;
      if (state.keys['arrowright'] || state.keys['d']) dx += 1;
      if (state.keys['arrowup'] || state.keys['w']) dy -= 1;
      if (state.keys['arrowdown'] || state.keys['s']) dy += 1;
      if (dx !== 0 || dy !== 0) {
        var len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        movePlayer(dx, dy, dt);
        if (dx !== 0) player.dir = dx > 0 ? 0 : 1;
        checkTriggers();
      }
    }

    draw();
    animId = requestAnimationFrame(tick);
  }

  function draw() {
    var cw = canvas.width;
    var ch = canvas.height;
    var camX = player.x - cw / 2;
    var camY = player.y - ch / 2;

    // Map
    var startTx = Math.max(0, Math.floor(camX / TILE));
    var startTy = Math.max(0, Math.floor(camY / TILE));
    var endTx = Math.min(MAP_W, Math.ceil((camX + cw) / TILE) + 1);
    var endTy = Math.min(MAP_H, Math.ceil((camY + ch) / TILE) + 1);

    for (var ty = startTy; ty < endTy; ty++) {
      for (var tx = startTx; tx < endTx; tx++) {
        var sx = tx * TILE - camX;
        var sy = ty * TILE - camY;
        if (MAP[ty][tx] === 1) {
          ctx.fillStyle = '#3d3550';
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
          ctx.strokeStyle = '#2a2438';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, sy, TILE, TILE);
        } else {
          ctx.fillStyle = '#252035';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.strokeStyle = '#1a1625';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, sy, TILE, TILE);
        }
      }
    }

    // NPCs
    ctx.fillStyle = '#8b7355';
    NPCS.forEach(function (npc) {
      var p = tileToPixel(npc.tx, npc.ty);
      var sx = p.x - camX - TILE/2;
      var sy = p.y - camY - TILE/2;
      ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      ctx.strokeStyle = '#6b5344';
      ctx.strokeRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    });

    // Player
    var px = player.x - camX - TILE/2;
    var py = player.y - camY - TILE/2;
    ctx.fillStyle = '#7a9b8e';
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = '#5a7b6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
  }

  function run() {
    try {
      init();
    } catch (err) {
      showError('Error: ' + (err && err.message ? err.message : String(err)));
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
