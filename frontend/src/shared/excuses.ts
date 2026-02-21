
const EXCUSES: string[] = [
  "My dog didn't eat my homework, but he did sit on my laptop and now the 'Enter' key only identifies as 'Shift'.",
  "I accidentally joined a high-stakes underground e-sports tournament and I'm currently the only hope for my team's survival.",
  "I was caught in a temporal rift where the last 48 hours technically haven't happened for me yet.",
  "My roommate replaced my coffee with decaf and I have been in a state of biological standby for three days.",
  "I was busy researching the historical accuracy of my favorite fantasy series to ensure my academic integrity remained intact.",
  "A swarm of bees decided my desk was the perfect place for a new colony, and I didn't want to disturb their workflow.",
  "I am currently trapped in a philosophical debate with a very persistent AI chatbot and cannot leave until we solve the Trolley Problem.",
  "I uploaded the wrong file, and by 'wrong file,' I mean a 400-page fanfiction I wrote in middle school. Please do not open it.",
  "My Wi-Fi router was possessed by the ghost of a 19th-century telegraph operator who only allows me to communicate in Morse code.",
  "I was following a 'productivity hack' that involved 12-hour naps, and I think I over-optimized.",
  "The gravity in my apartment increased by 15%, making it physically impossible to lift my arms to reach the keyboard.",
  "I tried to print my report, but my printer demanded a blood sacrifice or a Cyan ink cartridge. I have neither.",
  "I got stuck in a recursive loop of watching 'How to be Productive' videos on YouTube and lost track of linear time.",
  "A group of squirrels is holding my charging cable hostage in exchange for unsalted peanuts.",
  "I have developed a rare, temporary condition where I can only see in 3D, and my computer screen is tragically flat.",
  "My keyboard's 'S' key is broken, so I couldn't write anything without sounding like a very confused person.",
  "I accidentally automated my entire life with a script that has now locked me out of my own OS for 'security reasons'.",
  "I was helping a confused tourist find the library, but we ended up in a different timezone somehow.",
  "My brain has reached its storage capacity and is currently performing a mandatory disk defragmentation.",
  "I am currently officiating a wedding for two very charming pigeons on my balcony and it would be rude to leave."
]

export const getRandomExcuse = (): string => {
    const randomIndex = Math.floor(Math.random() * EXCUSES.length);
    return EXCUSES[randomIndex];
}