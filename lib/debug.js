import Config from './config';

export default (message, trace = false) => {
    if (Config.debug) {
        console.log(message);

        if (trace) {
            console.log(trace);
        }
    }
}