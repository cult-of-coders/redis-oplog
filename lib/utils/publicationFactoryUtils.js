export function create(publicationFactory, store, ...args) {
    let {cursors, channels} = parsePublicationResponse(
        fn.call(this, ...args)
    );

    publicationFactory.queue.runTask(() => {
        let publicationEntry = publicationFactory.create(cursors, channels);
        publicationEntry.addObserver(this);

        store.publicationEntry = publicationEntry;
    });
}