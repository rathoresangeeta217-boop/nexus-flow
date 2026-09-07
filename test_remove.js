const removeUndefined = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

const rec = {
  phases: [
    { id: '1', title: '', amount: '', status: 'Pending', screenshotUrl: undefined }
  ]
};

console.log(JSON.stringify(removeUndefined(rec)));
