export default (message) => {
    const dateTimeInUtc = new Date().toUTCString();
    console.log(`[${dateTimeInUtc}] - ` + message);

}
