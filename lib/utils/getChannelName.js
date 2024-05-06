import Config from "../config";

/**
 * Given a base channel name, applies the global prefix.
 *
 * @param baseChannelName
 * @return {string}
 */
export default function getChannelName(baseChannelName) {
  return (Config.globalRedisPrefix || "") + baseChannelName;
}
