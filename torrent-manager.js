const WebTorrent = require('webtorrent');
const fs = require('fs');
const PlexServer = require('./plex-server.js');
const { MessageEmbed } = require('discord.js');

class TorrentManager {

  static Type = {
    MOVIE: 'movie',
    TV: 'show'
  }

  static client = TorrentManager.instantiateTorrentClient();

  static async addTorrent(magnet, type, interaction) {
    // Defer reply for later
    await interaction.deferReply({ fetchReply: true });

    // Find which location to use
    const location = await PlexServer.getLibraryLocation(type);

    if(location == undefined) {
      interaction.editReply(`Not enough available space on the Plex server!`);
      return;
    }

    // Make sure the download path exists
    if(!fs.existsSync(location.path)) {
      fs.mkdirSync(location.path, { recursive: true });
    }

    const torrentOpts = {
      path: location.path,
      destroyStoreOnDestroy: false
    }

    TorrentManager.client.add(magnet, torrentOpts, (torrent) => { TorrentManager.#torrentCallback(torrent, location.availableSpace, interaction); });
  }

  static async getActiveTorrents() {
    return await TorrentManager.client.torrents;
  }

  static async #torrentCallback(torrent, availableSpace, interaction) {
    // First check to see if we'll have enough space to finish
    if(availableSpace - torrent.Length < 0) {
      interaction.editReply(`Not enough available space on the Plex server!`);

      // Stop torrenting and remove the file(s)
      torrent.destroy({ destroyStore: true });
      return;
    }

    const statusMessage = new MessageEmbed({
      title: torrent.name,
      description: `Download progress: ${Math.round(torrent.progress * 100)}%`,
      color: 'YELLOW'
    });

    const progressMessage = await interaction.editReply({ embeds: [statusMessage], fetchReply: true });

    // Update the download progress every 5 seconds
    const progressUpdater = setInterval(async () => {
      try {
        statusMessage.setColor(torrent.done ? 'GREEN' : 'YELLOW');
        statusMessage.setDescription(`Download progress: ${Math.round(torrent.progress * 100)}%`);
        await progressMessage.edit({ embeds: [statusMessage], fetchReply: true });
      } catch(error) {
        console.log('Error updating message with API:');
        console.log(error);
      }

      if(torrent.done) {
        clearInterval(progressUpdater);
        torrent.destroy();
      }
    }, 3000);
  }

  static instantiateTorrentClient() {
    let newClient = new WebTorrent({ webSeeds: false });
    newClient.on('error', (error) => {
      console.log(`WebTorrent client error: ${error}`);
    });
    return newClient;
  }

}

module.exports = TorrentManager;