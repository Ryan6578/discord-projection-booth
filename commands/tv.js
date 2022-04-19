const Command = require('./command.js');
const TorrentManager = require('../torrent-manager.js');

class TV extends Command {

  #interaction;
  
  constructor(interaction) {
    super(
      'tv',
      'Torrents a tv show to the Plex server.'
    );
    this.#interaction = interaction;
  }

  async execute() {
    TorrentManager.addTorrent(this.#interaction.options.get('magnet').value, TorrentManager.Type.TV, this.#interaction);
  }

}

module.exports = TV;