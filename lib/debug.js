import Config from "./config";

export default (message, trace = false) => {
  if (Config.debug) {
    const timestamp = new Date().getTime();
    console.log(`[${timestamp}] - ` + message);

    if (trace) {
      console.log(trace);
    }
  }
};
