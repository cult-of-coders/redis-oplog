import Config from './config';

export default (message, trace = false) => {
    if (Config.debug) {
        const dateTimeInUtc = new Date().toUTCString();
        console.log(`[${dateTimeInUtc}] - ` + message);

        if (trace) {
            console.log(trace);
        }
    }
}
