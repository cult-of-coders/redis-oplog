import { Items, Children } from './collections';

const ITEMS = 5;
const CHILDREN_PER_ITEM = 5;

export default async () => {
    await Items.removeAsync({});
    await Children.removeAsync({});

    for (let i = 0; i < ITEMS; i++) {
        const itemId = await Items.insertAsync({
            name: 'Name - ' + i
        });

        for (let j = 0; j < CHILDREN_PER_ITEM; j++) {
            await Children.insertAsync({
                name: 'Child - ' + i + '- ' + j,
                itemId
            })
        }
    }
}
