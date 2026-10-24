/* Johnson Family Game Night: game content (family-friendly, ages 8+). */
window.GN_CONTENT = {

/* ---------------- PARROT (id: copycat) ----------------
   prompt: shown on the TV. crowd: everyone's mission. copy: the Parrot's mission.
   Mix of debate rounds (pick a side) and sneaky behavior rounds. */
copycat: [
  {prompt:"What's the best breakfast?", crowd:"Argue that pancakes are the best breakfast.", copy:"Argue that waffles are the best breakfast."},
  {prompt:"Plan the perfect Saturday.", crowd:"Mention food at least twice.", copy:"Mention an animal at least twice."},
  {prompt:"What's the best superpower?", crowd:"Argue for flying.", copy:"Argue for invisibility."},
  {prompt:"Describe your dream house.", crowd:"Make sure it has a secret room.", copy:"Make sure it has a giant slide."},
  {prompt:"Which is better: summer or winter?", crowd:"Argue for summer.", copy:"Argue for winter, but only say nice things about rain."},
  {prompt:"Plan a family movie night.", crowd:"Ask someone a question at least once.", copy:"Agree with whoever spoke just before you, every time you talk."},
  {prompt:"What's the best pet?", crowd:"Argue for a dog.", copy:"Argue for a cat."},
  {prompt:"Invent a new school subject.", crowd:"Make it about cooking.", copy:"Make it about video games."},
  {prompt:"Where should the family go on vacation?", crowd:"Pick somewhere with a beach.", copy:"Pick somewhere with snow."},
  {prompt:"Describe the best birthday party ever.", crowd:"Include a surprise.", copy:"Include a costume."},
  {prompt:"What's the best way to spend a rainy day?", crowd:"Say the word \"cozy\" at least once.", copy:"Say the word \"adventure\" at least once."},
  {prompt:"Design the ultimate sandwich.", crowd:"Put cheese in it.", copy:"Put something sweet in it."},
  {prompt:"Which animal would win a race around the block?", crowd:"Argue for the cheetah.", copy:"Argue for the horse."},
  {prompt:"Plan a trip to space.", crowd:"Bring a pet along.", copy:"Bring a musical instrument along."},
  {prompt:"What's the worst chore?", crowd:"Argue that washing dishes is the worst.", copy:"Argue that folding laundry is the worst."},
  {prompt:"Invent a brand-new holiday.", crowd:"Make it about being kind.", copy:"Make it about candy."},
  {prompt:"Name the family band.", crowd:"Suggest a name with an animal in it.", copy:"Suggest a name with a color in it."},
  {prompt:"What's the best sport to watch?", crowd:"Argue for basketball.", copy:"Argue for soccer."},
  {prompt:"If you could live anywhere, where would it be?", crowd:"Pick a big city.", copy:"Pick somewhere out in nature."},
  {prompt:"What's the best thing about our family?", crowd:"Compliment the person on your left.", copy:"Compliment the person on your right."},
  {prompt:"Pitch a new ice cream flavor.", crowd:"Make it fruity.", copy:"Make it chocolatey."},
  {prompt:"You're the teacher for a day. What happens?", crowd:"Give everyone homework.", copy:"Cancel all homework."},
  {prompt:"What's the best thing to do at the beach?", crowd:"Touch your hair while you talk.", copy:"Touch your nose while you talk."},
  {prompt:"Which is the best Thai dish?", crowd:"Argue for pad thai.", copy:"Argue for mango sticky rice."},
  {prompt:"Plan the ultimate road trip.", crowd:"Mention a song you'd play.", copy:"Mention a snack you'd bring."},
  {prompt:"What should a robot butler do?", crowd:"Say it should clean your room.", copy:"Say it should do your homework."}
],

/* ---------------- TWEAKIN (id: glitch) ----------------
   title + scene go on the TV (no details). Each fact: [label, true value, glitched value].
   Glitched players get 2 facts swapped and don't know it. */
glitch: [
  {title:"The Vanishing Birthday Cake", scene:"Somebody's birthday cake disappeared before the party.", facts:[
    ["Where","On the kitchen counter","On the back porch table"],["When","3:00 in the afternoon","5:30 in the afternoon"],
    ["The cake","Chocolate with strawberries on top","Vanilla with rainbow sprinkles"],["Clue left behind","Muddy paw prints","A trail of crumbs"],["Witness","The mail carrier","The next-door neighbor"]]},
  {title:"The Museum Crown Caper", scene:"A famous crown went missing from the city museum.", facts:[
    ["Where","The east gallery","The west gallery"],["When","8:30 at night","10:15 at night"],
    ["What was taken","A golden crown with red jewels","A golden crown with blue jewels"],["How they got in","Through an open skylight","Through a broken window"],["Witness","The night security guard","A janitor mopping the floor"]]},
  {title:"The Great Zoo Escape", scene:"An animal slipped out of its home at the zoo.", facts:[
    ["The animal","A penguin named Pickles","A penguin named Biscuit"],["Escaped from","The ice pool","The rock pool"],
    ["Found at","The ice cream stand","The gift shop"],["Spotted by","A girl in a yellow raincoat","A boy in a red hoodie"],["Time found","Noon","2:00 PM"]]},
  {title:"The Midnight Snack Mystery", scene:"Someone raided the fridge in the middle of the night.", facts:[
    ["What was eaten","Half a pizza","A whole tub of ice cream"],["Time","Midnight","3:00 AM"],
    ["Left behind","A dirty spoon in the sink","An open fridge door"],["Noise heard","The fridge door squeaking","The stairs creaking"],["Who woke up first","The dog","Grandma"]]},
  {title:"The Sneaker Swap", scene:"Two pairs of shoes got switched at basketball practice.", facts:[
    ["Where","The school gym","The park court"],["Shoes","White high-tops with green laces","Black high-tops with red laces"],
    ["Size","Size 7","Size 9"],["Noticed by","The coach","The team captain"],["Found in","The lost-and-found box","Under the bleachers"]]},
  {title:"The Runaway Kite", scene:"A prize-winning kite flew away at the festival.", facts:[
    ["Kite shape","A dragon","A giant fish"],["Colors","Red and gold","Blue and silver"],
    ["Where it landed","On top of a palm tree","On the school roof"],["Wind","A sudden gust","A small storm"],["Who got it down","A firefighter with a ladder","A kid with a long broom"]]},
  {title:"The Secret Treehouse Note", scene:"A mysterious note appeared in the treehouse.", facts:[
    ["Written in","Purple marker","Green crayon"],["It said","Meet me at the big rock","Look under the welcome mat"],
    ["Signed","The Fox","The Owl"],["Found on","Tuesday morning","Thursday afternoon"],["Also left","A shiny marble","A paper airplane"]]},
  {title:"The Bake Sale Mix-Up", scene:"The money box at the school bake sale came up short.", facts:[
    ["Best seller","Cookies","Brownies"],["Missing money","20 dollars","50 dollars"],
    ["Box kept","Under the table","Next to the lemonade"],["Last person at the table","A teacher with glasses","A parent with a stroller"],["Found later","In the cookie jar","In a lunch bag"]]},
  {title:"The Lost Spaceship Toy", scene:"A favorite toy spaceship vanished from the playroom.", facts:[
    ["Color","Silver with a red stripe","White with a blue stripe"],["Last seen","On the bookshelf","In the toy box"],
    ["Time","After lunch","Before dinner"],["Found","Inside a sneaker","Behind the couch"],["Who found it","The little brother","The cat"]]},
  {title:"The Pool Party Puzzle", scene:"Someone's goggles disappeared at the pool party.", facts:[
    ["Goggle color","Bright orange","Bright pink"],["Pool area","The deep end","The shallow end"],
    ["Weather","Sunny and hot","Cloudy and windy"],["Snack being served","Watermelon slices","Popsicles"],["Found in","A beach bag","A flower pot"]]},
  {title:"The Night Market Mystery", scene:"A street-food cart's special sauce recipe went missing at the night market.", facts:[
    ["Food stall","Grilled chicken skewers","Fried bananas"],["Recipe written on","A napkin","The back of a menu"],
    ["Time","7:00 PM","9:00 PM"],["Weather","A light rain","Clear and warm"],["Witness","A tuk-tuk driver","A fruit seller"]]},
  {title:"The Science Fair Surprise", scene:"A science fair project was moved overnight.", facts:[
    ["The project","A baking-soda volcano","A model solar system"],["Moved to","The cafeteria","The library"],
    ["Prize ribbon","Blue for first place","Red for second place"],["Clue","Glitter on the floor","A trail of glue"],["Seen by","The principal","The custodian"]]},
  {title:"The Holiday Lights Blackout", scene:"Every holiday light on the street went dark at once.", facts:[
    ["Night","Friday","Saturday"],["Time","8:00 PM","9:30 PM"],
    ["First house to go dark","The blue house","The house with the red door"],["Strange sound","A loud pop","A buzzing hum"],["Cause","A squirrel chewed a wire","A tripped switch in the garage"]]},
  {title:"The Phantom Doorbell", scene:"The doorbell keeps ringing but nobody is ever there.", facts:[
    ["How many rings","Three quick rings","One long ring"],["Time","Every day at 4:00 PM","Every day at 6:00 PM"],
    ["Left on the step","A single flower","A smiley-face rock"],["Footprints","Tiny and muddy","Big and sandy"],["The culprit","A neighbor kid playing a prank","A very smart parrot"]]}
],

/* ---------------- SECRET AGENDA ----------------
   Scenario on the TV with 4 options; agendas are generated from these. */
agenda: [
  {title:"Family vacation", question:"Where should we go?", options:["Beach","Mountains","Theme park","City trip"]},
  {title:"Dinner tonight", question:"What are we eating?", options:["Pizza","Sushi","Tacos","Pad thai"]},
  {title:"Movie night", question:"What kind of movie?", options:["Comedy","Animated","Adventure","Spooky"]},
  {title:"New family pet", question:"What pet do we get?", options:["Dog","Cat","Bunny","Fish"]},
  {title:"Weekend plan", question:"What are we doing Saturday?", options:["Bowling","Park picnic","Board games","Swimming"]},
  {title:"Backyard upgrade", question:"What do we build?", options:["Treehouse","Pool","Trampoline","Garden"]},
  {title:"Family superpower", question:"Which power do we all get?", options:["Flying","Invisibility","Super speed","Teleporting"]},
  {title:"Birthday party theme", question:"What's the theme?", options:["Outer space","Superheroes","Under the sea","Dinosaurs"]},
  {title:"Road trip snacks", question:"Which snack do we pack?", options:["Chips","Fruit","Candy","Popcorn"]},
  {title:"Family band", question:"What kind of music do we play?", options:["Hip-hop","Rock","Pop","Jazz"]},
  {title:"Rainy day", question:"What do we do inside?", options:["Build a fort","Bake cookies","Video games","Movie marathon"]},
  {title:"Dream family car", question:"What do we drive?", options:["Monster truck","Convertible","Camper van","Flying car"]}
],

/* ---------------- RULEBREAKERS ----------------
   kind: what players type. test(x) decides ACCEPTED. Decoys come from other rules of the same kind. */
rules: {
  word: [
    {id:"len5",  text:"The word has exactly 5 letters",          test:w=>w.length===5,                          yes:"apple", no:"cat"},
    {id:"double",text:"The word has a double letter (like boo-k)", test:w=>/(.)\1/.test(w),                   yes:"bubble", no:"tiger"},
    {id:"vowel1",text:"The word starts with a vowel (A, E, I, O, U)", test:w=>/^[aeiou]/.test(w),             yes:"orange", no:"banana"},
    {id:"noE",   text:"The word has no letter E",                  test:w=>!/e/.test(w),                       yes:"dog", no:"tree"},
    {id:"endY",  text:"The word ends in Y",                        test:w=>/y$/.test(w),                       yes:"happy", no:"sad"},
    {id:"long",  text:"The word has 7 or more letters",            test:w=>w.length>=7,                         yes:"elephant", no:"mouse"},
    {id:"evenL", text:"The word has an even number of letters",    test:w=>w.length%2===0,                      yes:"frog", no:"horse"},
    {id:"firstHalf",text:"The word starts with a letter from A to M", test:w=>/^[a-m]/.test(w),               yes:"kite", no:"rocket"},
    {id:"hasA",  text:"The word has the letter A in it",           test:w=>/a/.test(w),                         yes:"pizza", no:"lemon"},
    {id:"sameEnds",text:"The word starts and ends with the same letter", test:w=>w.length>1&&w[0]===w[w.length-1], yes:"window", no:"table"},
    {id:"twoVowels",text:"The word has exactly 2 vowels",          test:w=>(w.match(/[aeiou]/g)||[]).length===2,yes:"water", no:"banana"},
    {id:"repeatAny",text:"Some letter shows up more than once",    test:w=>/(.).*\1/.test(w),                   yes:"cookie", no:"train"}
  ],
  number: [
    {id:"div3",  text:"The number can be divided by 3",            test:n=>n%3===0,                             yes:"12", no:"10"},
    {id:"has7",  text:"The number has a 7 in it",                  test:n=>/7/.test(String(n)),                 yes:"17", no:"16"},
    {id:"even",  text:"The number is even",                        test:n=>n%2===0,                             yes:"8", no:"9"},
    {id:"twoDig",text:"The number has exactly two digits",         test:n=>n>=10&&n<=99,                        yes:"42", no:"7"},
    {id:"sum10", text:"The digits add up to 10",                   test:n=>String(n).split("").reduce((a,b)=>a+ +b,0)===10, yes:"19", no:"20"},
    {id:"over50",text:"The number is bigger than 50",              test:n=>n>50,                                yes:"64", no:"30"},
    {id:"endsIn5or0",text:"The number ends in 5 or 0",             test:n=>n%5===0,                             yes:"35", no:"36"},
    {id:"sameDigits",text:"All the digits are the same",           test:n=>/^(\d)\1*$/.test(String(n)),         yes:"44", no:"45"}
  ]
}
};
