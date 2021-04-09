export default fields => {
	for (const value in fields)
		return fields[value] !== 1;

};
