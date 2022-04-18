require('dotenv').config()
const axios = require('axios').default;
const disk = require('diskusage');

class PlexServer {

  static #plexURL = process.env.PLEX_URL;
  static #plexToken = process.env.PLEX_TOKEN;
  static #threshold = process.env.PLEX_SPACE_THRESHOLD;

  constructor() {}

  /**
   * @description Helper function to fetch the library paths for a specified library type from Plex.
   * @param {string} type Type of library: 'movie' or 'show'
   * @returns {string[]} Array of locations for the given library type.
   */
  static async #fetchLibraries(type) {
    const locations = [];
    try {
      const plexLibraryResponse = await axios.get(`${PlexServer.#plexURL}/library/sections?X-Plex-Token=${PlexServer.#plexToken}`);
      for(const directory of plexLibraryResponse.data.MediaContainer.Directory) {
        if(type == undefined || directory.type == type) {
          for(const location of directory.Location) {
            locations.push(location.path);
          }
        }
      }
    } catch(error) {
      console.log(`Error getting available library location: ${error}`);
    }

    return locations;
  }

  /**
   * @description Gets the available, free, and total space for a given path.
   * @param {string} path Path on the filesystem to check.
   * @returns {object} JSON object containing available, free, and total space.
   */
  static async #getDiskInfo(path) {
    var result = { available: 0, free: 0, total: 0 };
    try {
      result = disk.checkSync(path);
    } catch(error) {
      console.log(`Error checking disk info for path '${path}': ${error}`);
    }
    return result;
  }

  /**
   * @description Checks the total amount of available space across all Plex library locations.
   * @param {string} type Type of library: 'movie' or 'show'
   * @returns {object} JSON object containing the available and total space for library locations.
   */
  static async checkSpace(type) {
    const result = {
      available: 0,
      total: 0,
    }

    // Check for valid library type (if specified)
    if(type != undefined && type != 'movie' && type != 'show') {
      console.log(`Unsupported library type indicated: ${type}`);
      return result;
    }

    const diskTracker = new Map();
    const paths = await PlexServer.#fetchLibraries();
    for(const path of paths) {
      const diskInfo = await PlexServer.#getDiskInfo(path);
      if(!diskTracker.has(diskInfo.total)) {
        result.available += diskInfo.available;
        result.total += diskInfo.total;
        diskInfo.set(diskInfo.total, true);
      }
    }

    return result;
  }

  /**
   * @description Gets the libaray location with the most space available (by library type).
   * @param {string} type Type of library: 'movie' or 'show'
   * @returns {object} JSON object containing the path and available space
   */
  static async getLibraryLocation(type) {
    // Check for valid library type
    if(type != 'movie' && type != 'show') {
      console.log(`Unsupported library type indicated: ${type}`);
      return undefined;
    }

    const paths = await PlexServer.#fetchLibraries(type);

    const result = { path: undefined, availableSpace: 0 };
    for(const path of paths) {
      const diskInfo = await PlexServer.#getDiskInfo(path);
      if(diskInfo.available > result.availableSpace) {
        result.path = path;
        result.availableSpace = diskInfo.available;
      }
    }

    return result;
  }

}

module.exports = PlexServer;