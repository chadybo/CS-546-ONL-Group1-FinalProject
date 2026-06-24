// Returns a cached reference to each MongoDB collection
import { dbConnection } from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;
  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = db.collection(collection);
    }
    return _col;
  };
};

export const users = getCollectionFn('users');
export const complaints = getCollectionFn('complaints');
export const hotspots = getCollectionFn('hotspots');
export const nyc311cache = getCollectionFn('nyc311cache');