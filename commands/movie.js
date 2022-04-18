const Command = require('./command.js');
const TorrentManager = require('../torrent-manager.js');

class Movie extends Command {

  #interaction;
  
  constructor(interaction) {
    super(
      'movie',
      'Torrents a movie to the Plex server.'
    );
    this.#interaction = interaction;
  }

  async execute() {
    TorrentManager.addTorrent(this.#interaction.options.get('magnet').value, TorrentManager.Type.MOVIE, this.#interaction);
  }

}

module.exports = Movie;