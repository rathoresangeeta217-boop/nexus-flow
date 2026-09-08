const amountStr = "Rs. 4,47,987";
// Wait, the formatting in the table is Rs. 4,47,987.
// Number(amountStr.replace(/[^0-9.]/g, '')) = 447987. Wait. 4,47,987 -> 447987.
// 447987 / 100000 = 4.47987.
// So why does it show 0.448? Let's check how the amount is stored and parsed!

// Oh, I see it! 
// When parsing from string, maybe it's parsed as 44798.7? Wait, let's look at the current OrdersTab.tsx logic.
