import { MongoInternals } from "meteor/mongo";
import observeChanges from "./observeChanges";

export default function () {
  MongoInternals.Connection.prototype._observeChanges = observeChanges;
}
