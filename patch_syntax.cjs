const fs = require('fs');
const file = 'src/components/VendorPaymentModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`,
  `                      </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`
);

fs.writeFileSync(file, content);
