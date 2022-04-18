const WebTorrent = require('webtorrent');
const fs = require('fs');
const PlexServer = require('./plex-server.js');
const { MessageEmbed } = require('discord.js');

class TorrentManager {

  static Type = {
    MOVIE: 'movie',
    TV: 'show'
  }

  static client = TorrentManager.#instantiateTorrentClient();

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

    TorrentManager.client.add(magnet, torrentOpts, (torrent) => { TorrentManager.#torrentCallback(torrent, type, location.availableSpace, interaction); });
  }

  static async getActiveTorrents() {
    return await TorrentManager.client.torrents;
  }

  static async #torrentCallback(torrent, type, availableSpace, interaction) {
    // First check to see if we'll have enough space to finish
    if(availableSpace - torrent.length < 0) {
      interaction.editReply(`Not enough available space on the Plex server!`);

      // Stop torrenting and remove the file(s)
      torrent.destroy({ destroyStore: true });
      return;
    }

    const statusMessage = new MessageEmbed({
      color: 'YELLOW'
    });

    // Update the download progress every 5 seconds
    const progressUpdater = setInterval(async () => {
      try {
        statusMessage.setColor(torrent.done ? 'GREEN' : 'YELLOW');
        statusMessage.setFields([
          {
            name: `${type == 'movie' ? 'Movie' : 'TV Show'} Name`,
            value: torrent.name,
            inline: false
          }, {
            name: 'Downloaded',
            value: `${(torrent.downloaded / 1000000000.0).toFixed(1)} GB`,
            inline: true
          }, {
            name: 'Download Speed',
            value: (torrent.done ? '-' : `${(torrent.downloadSpeed / 1000000.0).toFixed(1)} MB/s (${torrent.numPeers} peers)`),
            inline: true
          }, {
            name: 'Total Size',
            value: `${(torrent.length / 1000000000.0).toFixed(1)} GB`,
            inline: true
          }, {
            name: 'Download Progress',
            value: `${Math.round(torrent.progress * 100)}%`,
            inline: true
          }, {
            name: 'Time Remaining',
            value: TorrentManager.#secsToTime(torrent.timeRemaining / 1000),
            inline: true
          }
        ]);
        statusMessage.setFooter({ text: 'Last Updated' });
        statusMessage.setTimestamp(new Date());
        await interaction.editReply({ embeds: [statusMessage], fetchReply: true })
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

  static #secsToTime(secs) {
    const hoursLeft = Math.floor(secs / 3600);
    const minsLeft = Math.floor((secs % 3600) / 60);
    const secsLeft = Math.round((secs % 3600) % 60);

    return `${hoursLeft > 0 ? hoursLeft + 'h ' : ''}${hoursLeft > 0 || minsLeft > 0 ? minsLeft + 'm ' : ''}${secs > 0 ? secsLeft + 's' : '-'}`;
  }

  static #instantiateTorrentClient() {
    let newClient = new WebTorrent({ webSeeds: false });
    newClient.on('error', (error) => {
      console.log(`WebTorrent client error: ${error}`);
    });
    return newClient;
  }

}

module.exports = TorrentManager;