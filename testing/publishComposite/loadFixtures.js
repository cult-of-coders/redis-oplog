import {Items, Children} from './collections';

const ITEMS = 5;
const CHILDREN_PER_ITEM = 5;

export default () => {
    Items.remove({});
    Children.remove({});

    for (let i = 0; i < ITEMS; i++) {
        const itemId = Items.insert({
            name: 'Name - ' + i
        });

        for (let j = 0; j < CHILDREN_PER_ITEM; j++) {
            Children.insert({
                name: 'Child - ' + i + '- ' + j,
                itemId
            })
        }
    }
}
