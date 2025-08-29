// Test final WhatsApp export format
function testWhatsAppExportFinal() {
  // Mock data similar to what the component would have
  const allCapsules = [
    // Front section (11-24)
    { number: 'C11', section: 'front' },
    { number: 'C12', section: 'front' },
    { number: 'C13', section: 'front' },
    { number: 'C14', section: 'front' },
    { number: 'C15', section: 'front' },
    { number: 'C16', section: 'front' },
    { number: 'C17', section: 'front' },
    { number: 'C18', section: 'front' },
    { number: 'C19', section: 'front' },
    { number: 'C20', section: 'front' },
    { number: 'C21', section: 'front' },
    { number: 'C22', section: 'front' },
    { number: 'C23', section: 'front' },
    { number: 'C24', section: 'front' },
    
    // Living Room (25-26)
    { number: 'C25', section: 'middle' },
    { number: 'C26', section: 'middle' },
    
    // Room (1-6)
    { number: 'C1', section: 'back' },
    { number: 'C2', section: 'back' },
    { number: 'C3', section: 'back' },
    { number: 'C4', section: 'back' },
    { number: 'C5', section: 'back' },
    { number: 'C6', section: 'back' }
  ];

  const checkedInGuests = [
    { capsuleNumber: 'C11', name: 'hookann liang', expectedCheckoutDate: '2025-08-26', isPaid: true },
    { capsuleNumber: 'C12', name: 'David', expectedCheckoutDate: '2025-08-27', isPaid: false, balance: 150 },
    { capsuleNumber: 'C13', name: 'chan', expectedCheckoutDate: '2025-09-06', isPaid: true },
    { capsuleNumber: 'C14', name: 'khoo', expectedCheckoutDate: '2025-09-24', isPaid: true },
    { capsuleNumber: 'C15', name: 'yachao', expectedCheckoutDate: '2025-08-27', isPaid: true },
    { capsuleNumber: 'C16', name: 'kwang', expectedCheckoutDate: '2025-09-27', isPaid: true },
    { capsuleNumber: 'C17', name: 'jackson', expectedCheckoutDate: '2025-09-01', isPaid: true },
    { capsuleNumber: 'C18', name: 'long', expectedCheckoutDate: '2025-08-26', isPaid: false, balance: 300 },
    { capsuleNumber: 'C19', name: 'amer', expectedCheckoutDate: '2025-09-17', isPaid: true },
    { capsuleNumber: 'C20', name: 'Henry tung', expectedCheckoutDate: '2025-08-29', isPaid: true },
    { capsuleNumber: 'C22', name: 'nichs', expectedCheckoutDate: '2025-09-14', isPaid: true },
    { capsuleNumber: 'C24', name: 'john', expectedCheckoutDate: '2025-08-26', isPaid: true },
    { capsuleNumber: 'C1', name: 'haibo', expectedCheckoutDate: '2025-08-27', isPaid: true },
    { capsuleNumber: 'C4', name: 'kakar', expectedCheckoutDate: '2025-07-07', isPaid: true }
  ];

  // Mock functions
  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const isGuestPaid = (guest) => guest.isPaid;
  const getGuestBalance = (guest) => guest.balance || 0;

  // Simulate the WhatsApp export function
  let whatsappText = "🏨 *PELANGI CAPSULE STATUS* 🏨\n\n";
  
  // Group capsules by section and handle special cases
  const sections = ['back', 'middle', 'front'];
  
  sections.forEach(section => {
    const sectionCapsules = allCapsules
      .filter(capsule => capsule.section === section)
      .sort((a, b) => {
        const aNum = parseInt(a.number.replace('C', ''));
        const bNum = parseInt(b.number.replace('C', ''));
        return aNum - bNum;
      });
    
    if (sectionCapsules.length > 0) {
      whatsappText += `📍 *${section.toUpperCase()} SECTION* 📍\n`;
      
      sectionCapsules.forEach(capsule => {
        const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
        
        if (guest) {
          // Guest is checked in
          const isPaid = isGuestPaid(guest);
          const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
          const paymentStatus = isPaid ? '✅' : '❌';
          
          // Check for outstanding balance
          const balance = getGuestBalance(guest);
          const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
          
          whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
        } else {
          // Empty capsule
          whatsappText += `${capsule.number.replace('C', '')})\n`;
        }
      });
      
      whatsappText += '\n';
    }
  });
  
  // Handle special sections - Living Room (capsules 25, 26)
  whatsappText += '🏠 *LIVING ROOM* 🏠\n';
  const livingRoomCapsules = allCapsules.filter(capsule => {
    const num = parseInt(capsule.number.replace('C', ''));
    return num === 25 || num === 26;
  }).sort((a, b) => {
    const aNum = parseInt(a.number.replace('C', ''));
    const bNum = parseInt(b.number.replace('C', ''));
    return aNum - bNum;
  });
  
  livingRoomCapsules.forEach(capsule => {
    const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
    if (guest) {
      const isPaid = isGuestPaid(guest);
      const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
      const paymentStatus = isPaid ? '✅' : '❌';
      const balance = getGuestBalance(guest);
      const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
      whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
    } else {
      whatsappText += `${capsule.number.replace('C', '')})\n`;
    }
  });
  
  // Handle special sections - Room (capsules 1-6)
  whatsappText += '\n🛏️ *ROOM* 🛏️\n';
  const roomCapsules = allCapsules.filter(capsule => {
    const num = parseInt(capsule.number.replace('C', ''));
    return num >= 1 && num <= 6;
  }).sort((a, b) => {
    const aNum = parseInt(a.number.replace('C', ''));
    const bNum = parseInt(b.number.replace('C', ''));
    return aNum - bNum;
  });
  
  roomCapsules.forEach(capsule => {
    const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
    if (guest) {
      const isPaid = isGuestPaid(guest);
      const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
      const paymentStatus = isPaid ? '✅' : '❌';
      const balance = getGuestBalance(guest);
      const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
      whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
    } else {
      whatsappText += `${capsule.number.replace('C', '')})\n`;
    }
  });
  
  whatsappText += '\n——————————————\n';
  whatsappText += '📅 *Last Updated:* ' + new Date().toLocaleDateString('en-GB') + '\n';
  whatsappText += '⏰ *Time:* ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  console.log("🏨 WHATSAPP EXPORT FORMAT TEST 🏨");
  console.log("=====================================");
  console.log(whatsappText);
  console.log("=====================================");
  console.log("✅ Test completed successfully!");
}

// Run the test
testWhatsAppExportFinal();
