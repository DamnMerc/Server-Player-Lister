const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request');
const { error } = require('console');
const promisifiedRequest = function(options) {
  return new Promise((resolve,reject) => {
    request(options, (error, response, body) => {
      if (response) {
        return resolve(response);
      }
      if (error) {
        return reject(error);
      }
    });
  });
};
const Settings = {
  Places : [
    { ID: 1730877806,
      Name: "one piece"
    },
    { ID: 5049335549,
      Name: "cyber punk game"
    }
  ],
  Guid_Id: "IDHERE",
  Channel_Id: "IDHERE",
  Embed: {
    EmbedTitle: "Title for the Embed",
    EmbedDesc: "Description for Embed"
  },
  UpdateTime: 10, // this is in minutes do not have below 8
  LogDebug: true // this will just console log results and at what point they were logged (ready = bot started, update = when messageobj is made/edited, auto = updatetime request)
}

// DO NOT TOUCH ANYTHING BELOW HERE UNLESS BOT TOKEN AT VERY BOTTOM
const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
async function ReturnData(Id, nextPageCursorId) {
  if (nextPageCursorId) {
    const options = {
      url: `https://games.roblox.com/v1/games/${Id}/servers/Public?cursor=${nextPageCursorId}&limit=100&sortOrder=Asc`,
      method: 'GET',
      gzip: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.96 Safari/537.36'
      }
    }
    let response = await promisifiedRequest(options);
    let parsed = JSON.parse(response.body)
    if (parsed.errors) {
      if (parsed.errors[0].code == 1) {
        console.log(`[ERROR]: Invalid placeId (${Id}) given, try again`)
        process.exit(1)
      } else if (parsed.errors[0].code == 0) {
        if (parsed.errors[0].message == "Invalid cursor") {
          console.log(`[ERROR]: Incorrect cursor given, cursor: ${nextPageCursorId}`)
          process.exit(1)
        } else {
          console.log(`[ERROR]: Too many requests, please refrain from setting UpdateTime to less than 8 minutes`)
          process.exit(1)
        }
      }
    } else {
      return parsed
    }
  } else {
    const options = {
      url: `https://games.roblox.com/v1/games/${Id}/servers/Public?limit=100&sortOrder=Asc`,
      method: 'GET',
      gzip: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.96 Safari/537.36'
      }
    }
    let response = await promisifiedRequest(options);
    let parsed = JSON.parse(response.body)
    if (parsed.errors) {
      if (parsed.errors[0].code == 1) {
        console.log(`[ERROR]: Invalid placeId (${Id}) given, try again`)
        process.exit(1)
      } else if (parsed.errors[0].code == 0) {
        console.log(`[ERROR]: Too many requests, please refrain from setting UpdateTime to less than 8 minutes`)
        process.exit(1)
      }
    } else {
      return parsed
    }
  }

}
async function GetPlayerCount(obj, existing_table, nextPageCursor) {
  if (nextPageCursor) {
    let Players = existing_table.Players
    let Servers = existing_table.Servers
    let Name = existing_table.Name
    let req = await ReturnData(obj.ID,nextPageCursor)
    let Collect = req.data
    await asyncForEach(Collect, async (Pos) => {
      await waitFor(10)
      if (Pos.playing != undefined) {
        Players += Pos.playing
      }
      Servers += 1
    })
    if (req.nextPageCursor) {
      return GetPlayerCount(obj,{Name,Players, Servers}, req.nextPageCursor)
    } else {
      return {Name,Players,Servers}
    }
  } else {
    let req = await ReturnData(obj.ID)
    let Collect = req.data
    let Players = 0
    let Servers = 0
    let Name = obj.Name
    await asyncForEach(Collect, async (Pos) => {
      await waitFor(10)
      if (Pos.playing != undefined) {
        Players += Pos.playing
      }
      Servers += 1
    });
    if (req.nextPageCursor) {
      // recurse for page cursor

      return GetPlayerCount(obj,{Name,Players, Servers}, req.nextPageCursor)
    } else {
      return {Name,Players,Servers}
    }
  }
}
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)
  let guild = client.guilds.cache.get(Settings.Guild_Id)
  if (!guild) {
    console.log('[ERROR]: Guild does not exist')
    process.exit(1)
  }
  let channel = guild.channels.cache.get(Settings.Channel_Id)
  if (!channel) {
    console.log('[ERROR]: Channel does not exist')
    process.exit(1)
  }
  let plsawait = []
  Settings.Places.forEach(o => 
    plsawait.push(GetPlayerCount(o))
  )
  let Results = await Promise.all(plsawait)
  if (Settings.LogDebug == true) {
    console.log('ready',Results)
  }
  let messages = await channel.messages.fetch()
  if (messages.size == 0) {
    //start it
    let embed = new Discord.MessageEmbed()
    .setColor("#7289da")
    .setTitle(Settings.Embed.EmbedTitle)
    .setDescription(Settings.Embed.EmbedDesc)
    .setTimestamp()
    Results.forEach(result => {
      if (result.Players > 0) {
        embed.addField(result.Name, `${result.Players} players playing with ${result.Servers} servers`, false)
      } else {
        embed.addField(result.Name, `No players currently`, false)
      }
    })
    let m = await channel.send(embed)
    update(m)
  } else {
    let m = messages.first()
    update(m)
  }
})
async function update(message) {
  let plsawait = []
  Settings.Places.forEach(o => 
    plsawait.push(GetPlayerCount(o))
  )
  let Results = await Promise.all(plsawait)
  if (Settings.LogDebug == true) {
    console.log('update',Results)
  }
  let embed = new Discord.MessageEmbed()
  .setColor("#7289da")
  .setTitle(Settings.Embed.EmbedTitle)
  .setDescription(Settings.Embed.EmbedDesc)
  .setTimestamp()
  Results.forEach(result => {
    if (result.Players > 0) {
      embed.addField(result.Name, `${result.Players} players playing with ${result.Servers} servers`, false)
    } else {
      embed.addField(result.Name, `No players currently`, false)
    }
  })
  message.edit(embed);
  setInterval(async function(){
    if (!message) {
      console.log('[ERROR]: MessageObject does not exist')
      process.exit(1)
    }
    let plsawait = []
    Settings.Places.forEach(o => 
      plsawait.push(GetPlayerCount(o))
    )
    let Results = await Promise.all(plsawait)
    if (Settings.LogDebug == true) {
      console.log('auto',Results)
    }
    let embed = new Discord.MessageEmbed()
    .setColor("#7289da")
    .setTitle(Settings.Embed.EmbedTitle)
    .setDescription(Settings.Embed.EmbedDesc)
    .setTimestamp()
    Results.forEach(result => {
      if (result.Players > 0) {
        embed.addField(result.Name, `${result.Players} players playing with ${result.Servers} servers`, false)
      } else {
        embed.addField(result.Name, `No players currently`, false)
      }
    })
    message.edit(embed);
  }, Settings.UpdateTime *1000*60);
}
client.login('BOT TOKEN');
