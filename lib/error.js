export default (message, error) => {
    const dateTimeInUtc = new Date().toUTCString();
    console.error(`[${dateTimeInUtc}] - ` + message, error);
}
