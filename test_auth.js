import fs from "fs";
const file = fs.readFileSync("src/contexts/AuthContext.tsx", "utf-8");
console.log(file.includes("use to login"));
