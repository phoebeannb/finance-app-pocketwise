import DeletedItem from "../models/DeletedItem.js";

export async function archiveDeleted(userId, type, document) {
  const data = document.toObject ? document.toObject() : { ...document };
  delete data._id;
  delete data.__v;
  await DeletedItem.create({ user: userId, type, originalId: document._id, data });
}
