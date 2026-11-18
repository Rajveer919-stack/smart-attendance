// Naye features ka Hinglish -> English (login, dashboards, planner, bulk upload, Excel, leave, streak/badges, privacy).
// extra.js isko registerMore() se jodta hai. Pehle PATTERNS (poora text match), phir PAIRS (text ka hissa).
// "Agla badge: <naam>" me naam bhi badalna hai
const BADGE_EN = {
  'Pehla Kadam': 'First Step',
  'Lagatar 5': '5 in a Row',
  'Lagatar 10': '10 in a Row',
  'Lagatar 25': '25 in a Row',
  '50 Class': '50 Classes',
  '100 Class': '100 Classes',
  'Samay ke Paabandi': 'Punctual',
  'Pura Subject': 'Perfect Subject',
};
const T = (s) => BADGE_EN[s] || s;

const MORE_PAIRS = [
  // ---- Login ----
  ["Ye admin account hai. Neeche se Admin Login chuno", "This is an admin account. Choose Admin Login below"],
  ["Ye teacher account hai. Neeche se Teacher Login chuno", "This is a teacher account. Choose Teacher Login below"],
  ["Ye student account hai. Neeche se Student Login chuno", "This is a student account. Choose Student Login below"],
  ["Streak aur badges", "Streak and badges"],
  ["Light mode chalu karo", "Turn on light mode"],
  ["Dark mode chalu karo", "Turn on dark mode"],
  ["Naya QR", "New QR in"],
  ["second me", "seconds"],
  ["Menu search karo (jaise students)", "Search the menu (e.g. students)"],

  // ---- Dashboards ----
  ["Fingerprint ya face se verify karo...", "Verify with your fingerprint or face..."],
  ["Teacher ke announcements", "Teacher announcements"],
  ["Kam dikhao", "Show less"],
  ["Sab theek hai, par ab koi class chhodna mat.", "All good, but do not skip any more classes."],
  ["Sab theek hai", "All good"],
  ["Phone nahi hai? Teacher ke paas jaakar apna roll number batao, wo haath se attendance laga denge.", "No phone? Tell your roll number to the teacher and they will mark your attendance manually."],
  ["Class dobara chalu nahi ho payi", "Could not reopen the class"],
  ["Class ko announcement bhejo", "Send an announcement to the class"],
  ["Dobara khul sakti", "Can be reopened"],
  ["Chal rahi class", "Running class"],
  ["Ho raha hai...", "Working..."],
  ["Dobara chalu karo", "Reopen"],
  ["Abhi tumhare naam par koi subject nahi hai. Admin se subject banwao.", "No subjects are assigned to you yet. Ask the admin to create subjects."],
  ["Sab kuch ek jagah se sambhalo.", "Manage everything from one place."],
  ["Saari leave requests", "All leave requests"],
  ["Subject ban gaya aur teacher ko mil gaya", "Subject created and assigned to the teacher"],
  ["Naya password (sirf badalna ho tab)", "New password (only if you want to change it)"],

  // ---- Attendance planner ----
  ["Aage kitni class chhodunga", "How many classes will I skip"],
  ["Aage kitni class attend karunga", "How many classes will I attend"],
  ["Kam karo", "Decrease"],
  ["Zyada karo", "Increase"],
  ["Chhodi hui class", "Classes skipped"],
  ["Attend ki hui class", "Classes attended"],
  ["Itni class mat chhodo.", "Do not skip that many classes."],
  ["Aur class attend karni hongi.", "You will need to attend more classes."],
  ["ab mat chhodo", "do not skip"],
  ["Saare subjects ek sath dekho", "See all subjects together"],

  // ---- Excel export ----
  ["Excel nahi ban payi. Thodi der baad try karo", "Could not create the Excel file. Please try again later"],
  ["Saare subjects ka Excel", "Excel of all subjects"],
  ["Ek file me 3 sheet: subject-wise hisaab, har student ka subject-wise %, aur 75% se kam wale students.", "One file with 3 sheets: subject-wise summary, each student's subject-wise %, and students below 75%."],
  ["Se (date)", "From (date)"],
  ["Tak (date)", "To (date)"],
  ["Sab", "All"],
  ["Is filter me koi subject nahi mila", "No subject found for this filter"],
  ["Excel nahi ban payi", "Could not create the Excel file"],

  // ---- Bulk upload (screen) ----
  ["Bulk upload (CSV se students jodo)", "Bulk upload (add students from a CSV file)"],
  ["Ek sath ", "Up to "],
  [" tak student, ek-ek karke nahi.", " students at once, not one by one."],
  ["Band karo", "Close"],
  ["Upload shuru karo", "Start upload"],
  ["Template download karo aur Excel me students bharo (naam, email, roll no, department, semester).", "Download the template and fill in the students in Excel (name, email, roll no, department, semester)."],
  ["Excel me File → Save As → \"CSV (Comma delimited)\" karke save karo.", "In Excel choose File → Save As → \"CSV (Comma delimited)\" and save."],
  ["Neeche wo .csv file chuno. Pehle check hoga, phir tum upload dabaoge.", "Choose that .csv file below. It is checked first, then you press upload."],
  ["Password column khali chhodoge to har student ka apne aap ban jayega (baad me download kar paoge).", "If you leave the password column empty, a password is generated for each student (you can download them afterwards)."],
  ["CSV file chuno", "Choose a CSV file"],
  ["Template download", "Download template"],
  ["Ho raha hai, thoda ruko...", "Working, please wait..."],
  ["Galat rows chhod di jayengi. Chaho to file theek karke dobara chuno.", "Invalid rows will be skipped. You can also fix the file and choose it again."],
  ["Passwords sirf abhi dikhte hain, baad me wapas nahi milenge. Ye file download karke students ko do (wo baad me Account me badal sakte hain).", "Passwords are shown only now and cannot be recovered later. Download this file and give it to the students (they can change it later in Account)."],
  ["Passwords ki file download karo", "Download passwords file"],
  ["Dusri file upload karo", "Upload another file"],
  ["Kya dikkat hai", "What is wrong"],
  ["Pehli 100 galtiyan dikha rahe hain.", "Showing the first 100 errors."],
  ["Excel file seedhi nahi chalegi. Excel me File → Save As → \"CSV (Comma delimited)\" chuno aur wo .csv file upload karo.", "An Excel file cannot be used directly. In Excel choose File → Save As → \"CSV (Comma delimited)\" and upload that .csv file."],
  ["Check nahi ho paya", "Could not check the file"],
  ["Upload nahi ho paya", "Could not upload"],
  // ---- Bulk upload (server: har row ki galti) ----
  ["Koi student row nahi mili", "No student rows found"],
  ["Naam khali hai", "Name is empty"],
  ["Naam bahut lamba hai", "Name is too long"],
  ["Department sahi nahi (", "Invalid department ("],
  ["Semester 1 se 8 hona chahiye", "Semester must be 1 to 8"],
  ["Ye email file me line ", "This email is also in the file on line "],
  [" par bhi hai", ""],
  ["Is class me ye roll number file me line ", "This roll number is also in the file on line "],
  ["Is class me ye roll number pehle se kisi ka hai", "This roll number already belongs to someone in this class"],
  ["Email ya roll number pehle se maujood hai", "The email or roll number already exists"],
  ["Save nahi ho paya", "Could not save"],
  ["Bulk upload me dikkat aayi. Thodi der baad try karo", "There was a problem with the bulk upload. Please try again later"],

  // ---- Streak aur badges ----
  ["Badges load ho rahe hain...", "Loading badges..."],
  ["Badges load nahi hue", "Could not load badges"],
  ["class lagatar", "classes in a row"],
  ["Pehli class attend karo, streak shuru ho jayegi.", "Attend your first class and your streak will begin."],
  ["Pehla Kadam", "First Step"],
  ["Pehli class attend ki", "Attended your first class"],
  ["Lagatar 5", "5 in a Row"],
  ["Lagatar 10", "10 in a Row"],
  ["Lagatar 25", "25 in a Row"],
  ["Bina chhode 5 class", "5 classes without a miss"],
  ["Bina chhode 10 class", "10 classes without a miss"],
  ["Bina chhode 25 class", "25 classes without a miss"],
  ["50 Class", "50 Classes"],
  ["100 Class", "100 Classes"],
  ["Kul 50 class attend ki", "Attended 50 classes in total"],
  ["Kul 100 class attend ki", "Attended 100 classes in total"],
  ["Samay ke Paabandi", "Punctual"],
  ["10 baar class shuru hote hi attendance", "Marked attendance right at the start of class 10 times"],
  ["Pura Subject", "Perfect Subject"],
  ["Kisi subject me 10+ class aur ek bhi miss nahi", "No miss at all in a subject with 10+ classes"],
  ["20+ class me 90% ya zyada attendance", "90% or more attendance over 20+ classes"],

  // ---- Leave (student) ----
  ["Leave maango", "Request leave"],
  ["Teacher approve karega to tumhe notification aayegi.", "You will get a notification when the teacher approves."],
  ["Jawab baaki", "Awaiting reply"],
  ["Request nahi ja payi. Thodi der baad try karo", "The request could not be sent. Please try again later"],
  ["Request nahi ja payi", "The request could not be sent"],
  ["Ye request hatani hai?", "Remove this request?"],
  ["Request nahi hati", "The request could not be removed"],
  ["Se", "From"],
  ["Tak", "To"],
  ["Wajah", "Reason"],
  ["Jaise: bukhar hai, doctor ne aaram bola", "e.g. I have a fever, the doctor advised rest"],
  ["Bhej rahe hain...", "Sending..."],
  ["Request bhejo", "Send request"],
  ["Request hatao", "Remove request"],
  ["Leave request bhej di gayi", "Leave request sent"],
  ["Leave list nahi mili", "Could not load the leave list"],
  ["Ye request ab hata nahi sakte", "This request can no longer be removed"],
  ["Request hata di gayi", "Request removed"],
  ["Request nahi mili", "Request not found"],

  // ---- Leave (teacher / admin) ----
  ["Baaki", "Pending"],
  ["Leave requests nahi mili", "Could not load leave requests"],
  ["Faisla save nahi hua", "Could not save the decision"],
  ["Koi leave request baaki nahi hai.", "No leave requests are pending."],
  ["Abhi tak koi leave request nahi aayi.", "No leave request has come in yet."],
  ["Leave approve ho gayi", "Leave approved"],
  ["Leave reject ho gayi", "Leave rejected"],
  ["Is request par pehle hi faisla ho chuka hai", "A decision has already been made on this request"],
  ["Ye student tumhari class ka nahi hai", "This student is not in your class"],
  ["Faisla approved ya rejected hona chahiye", "The decision must be approved or rejected"],
  ["Dates sahi nahi hain", "The dates are not valid"],
  ["Aakhri date shuru ki date se pehle nahi ho sakti", "The end date cannot be before the start date"],
  ["Itni aage ki leave abhi nahi maangi ja sakti", "Leave this far ahead cannot be requested yet"],
  ["Wajah thodi detail me likho (kam se kam 5 akshar)", "Write the reason in a bit more detail (at least 5 characters)"],
  ["Wajah 300 akshar se choti rakho", "Keep the reason under 300 characters"],
  ["Tumhari class set nahi hai", "Your class is not set"],
  ["In dates ki request pehle se maujood hai", "A request for these dates already exists"],

  // ---- Alerts (screen par dikhne wale) ----
  ["Unhe attendance alert bhej diya gaya hai. Report dekhne ke liye kholo.", "They have been sent an attendance alert. Open to see the report."],

  // ---- Server ----
  ["Server par abhi bahut load hai. 3-4 second baad dobara try karo", "The server is very busy right now. Try again in 3-4 seconds"],

  // ---- Privacy ----
  ["← Back to login", "← Back to login"],
  ["Smart Attendance System ek college attendance app hai. Is page par likha hai ki hum kaunsa data lete hain, kyun lete hain aur uska kya karte hain.", "Smart Attendance System is a college attendance app. This page explains what data we collect, why we collect it and what we do with it."],
  ["1. Hum kaunsa data lete hain", "1. What data we collect"],
  ["Account ki details: naam, email, role (student / teacher / admin), department, semester, roll number, aur password (sirf encrypted/hashed form me).", "Account details: name, email, role (student / teacher / admin), department, semester, roll number, and password (only in encrypted/hashed form)."],
  ["Attendance ka record: kis subject me, kis din aur kis samay attendance lagi.", "Attendance record: which subject, which day and what time attendance was marked."],
  ["Location: sirf attendance lagate samay, ye check karne ke liye ki student class ke paas hai ya nahi. Location ko background me track nahi kiya jata.", "Location: only while marking attendance, to check whether the student is near the class. Location is not tracked in the background."],
  ["Device ki pehchaan: attendance ke galat istemal (ek phone se doosre ki attendance) rokne ke liye.", "Device identifier: to prevent misuse of attendance (marking someone else's attendance from one phone)."],
  ["Notification ka token: agar tum notifications allow karte ho, to announcements bhejne ke liye.", "Notification token: if you allow notifications, to send you announcements."],
  ["2. Camera aur fingerprint", "2. Camera and fingerprint"],
  ["Camera sirf QR code scan karne ke liye khulta hai. Photo ya video save ya upload nahi hoti. Fingerprint / face lock tumhare phone ka apna system hai (WebAuthn). Tumhara fingerprint ya face data hum tak kabhi nahi aata, sirf phone batata hai ki \"verify ho gaya\".", "The camera opens only to scan the QR code. No photo or video is saved or uploaded. Fingerprint / face lock is your phone's own system (WebAuthn). We never receive your fingerprint or face data, the phone only tells us that it \"was verified\"."],
  ["3. Data ka istemal", "3. How data is used"],
  ["Data sirf attendance lagane, reports aur analytics dikhane, aur announcements bhejne ke liye use hota hai. Hum data bechte nahi hain aur kisi vigyapan (advertising) company ko nahi dete.", "Data is used only to mark attendance, show reports and analytics, and send announcements. We do not sell data and do not give it to any advertising company."],
  ["4. Kaun dekh sakta hai", "4. Who can see it"],
  ["Student apni attendance dekhta hai. Teacher apne subjects ke students ki attendance dekhta hai. Admin poore college ka data dekh sakta hai.", "A student sees their own attendance. A teacher sees the attendance of students in their subjects. The admin can see the data of the whole college."],
  ["5. Data kahan rehta hai aur kitne din", "5. Where data is stored and for how long"],
  ["Data secure cloud database (MongoDB Atlas) me rehta hai aur sirf HTTPS ke through jata hai. Account tab tak rehta hai jab tak college use chalata hai ya tum delete karne ko nahi kehte.", "Data is kept in a secure cloud database (MongoDB Atlas) and travels only over HTTPS. The account stays as long as the college uses the app or until you ask for it to be deleted."],
  ["6. Login ko yaad rakhna", "6. Remembering your login"],
  ["Baar baar login na karna pade, isliye app ek secure cookie / token device par rakhti hai. Logout karne par ye hat jata hai.", "So that you do not have to log in again and again, the app keeps a secure cookie / token on your device. It is removed when you log out."],
  ["7. Data delete karwana", "7. Getting your data deleted"],
  ["Apna account aur data delete karwane ke liye apne college admin se kaho, ya hume is email par likho:", "To get your account and data deleted, ask your college admin or write to us at this email:"],
  [". Request milne ke baad data hata diya jata hai.", ". After the request is received the data is removed."],
  ["8. Bachchon ka data", "8. Children's data"],
  ["Ye app college ke students ke liye hai. Hum jaan-boojh kar 13 saal se kam umar ke bachchon ka data nahi lete.", "This app is for college students. We do not knowingly collect data from children under 13."],
  ["9. Badlav", "9. Changes"],
  ["Ye policy badal sakti hai. Naya version isi page par daal diya jayega aur upar ki date badal jayegi.", "This policy may change. The new version will be posted on this page and the date above will be updated."],
  ["10. Sampark", "10. Contact"],
  ["Sawal ho to:", "Questions?"],
];

const MORE_PATTERNS = [
  // ---- Dashboards ----
  [/^(\d+) naye$/, '$1 new'],
  [/^Sab dikhao \((\d+)\)$/, 'Show all ($1)'],
  [/^Class band ho gayi\. Late students ke liye (\d+) minute tak dobara chalu kar sakte ho\.$/, 'Class closed. You can reopen it for late students for $1 more minute(s).'],
  [/^Roll number \(1 se (\d+)\)$/, 'Roll number (1 to $1)'],

  // ---- Planner ----
  [/^Abhi ([\d.]+)%\s+→$/, 'Now $1%  →'],
  [/^\((\d+) \/ (\d+) class\)$/, '($1 / $2 classes)'],
  [/^Theek hai, (\d+)% se upar rahoge\.$/, 'All good, you will stay above $1%.'],
  [/^(\d+)% se neeche chale jaoge\. Itni class mat chhodo\.$/, 'You will drop below $1%. Do not skip that many classes.'],
  [/^(\d+)% se neeche chale jaoge\. Aur class attend karni hongi\.$/, 'You will drop below $1%. You will need to attend more classes.'],
  [/^(.*): (\d+)% rakhte hue tum lagatar (\d+) class tak chhod sakte ho\.$/, '$1: staying at $2%, you can skip up to $3 classes in a row.'],
  [/^(.*): (\d+)% par ho, ab koi class chhodna mat\.$/, '$1: you are at $2%, do not skip any more classes.'],
  [/^(.*): (\d+)% tak pahunchne ke liye lagatar (\d+) class aur attend karni hogi\.$/, '$1: to reach $2% you need to attend $3 more classes in a row.'],
  [/^(\d+) chhod sakte$/, 'can skip $1'],
  [/^(\d+) class chahiye$/, 'need $1 classes'],

  // ---- Excel export (server) ----
  [/^Ek sath (\d+) se zyada subject nahi\. Department ya semester chuno$/, 'No more than $1 subjects at a time. Choose a department or semester'],

  // ---- Bulk upload ----
  [/^File me ye column nahi mile: file me header aur kam se kam ek student chahiye\. Template download karke dekho\.$/, 'The file needs a header row and at least one student. Download the template to see the format.'],
  [/^File me ye column nahi mile: (.*)\. Template download karke dekho\.$/, 'These columns were not found in the file: $1. Download the template to see the format.'],
  [/^Ek baar me (\d+) se zyada student nahi \(file me (\d+) hain\)\. File ko hisso me baant do\.$/, 'No more than $1 students at a time (the file has $2). Split the file into parts.'],
  [/^Ek baar me (\d+) se zyada student nahi\. File ko hisso me baant do$/, 'No more than $1 students at a time. Split the file into parts'],
  [/^(\d+) sahi$/, '$1 valid'],
  [/^(\d+) galat$/, '$1 invalid'],
  [/^\(kul (\d+)\)$/, '(total $1)'],
  [/^Sahi (\d+) students banao$/, 'Create the $1 valid students'],
  [/^(\d+) students ban gaye\. (\d+) nahi bane\.$/, '$1 students created. $2 were not created.'],
  [/^(\d+) students ban gaye\.$/, '$1 students created.'],

  // ---- Streak ----
  [/^Sabse lambi streak: (\d+) class$/, 'Longest streak: $1 classes'],
  [/^Agla badge: (.*)$/, (m, a) => 'Next badge: ' + T(a)],

  // ---- Leave ----
  [/^(\d+) din$/, '$1 day(s)'],
  [/^Ek request me (\d+) din se zyada nahi$/, 'A single request can be for at most $1 days'],
  [/^(\d+) din se purani date ki leave nahi maangi ja sakti$/, 'Leave cannot be requested for a date older than $1 days'],
  [/^Ek sath (\d+) se zyada pending request nahi\. Pehle purani ka jawab aane do$/, 'No more than $1 pending requests at a time. Wait for a reply to the older ones'],

  // ---- Alert message (teacher ko dikhta hai) ----
  [/^Attendance kam hai: (.*)$/, 'Low attendance: $1'],
];


// ---- Doosra round: poore project ki jaanch ke baad bache hue server messages ----
const MORE_PAIRS_2 = [
  ["Bahut saare lock lag chuke hai. Admin se reset karwao", "Too many locks have been set. Ask the admin to reset"],
  ["Site ka address badal gaya. Dobara koshish karo", "The site address has changed. Please try again"],
  ["Lock set nahi ho paya:", "Could not set the lock:"],
  ["Is site/app par lock ON nahi hai. Dashboard ki Settings me jaakar lock ON karo", "The lock is not ON for this site/app. Go to Settings in the dashboard and turn the lock ON"],
  ["Notification sahi chal rahi hai.", "Notifications are working fine."],
  ["Attendance lagao: QR scan karo ya 4 ank ka code daalo.", "Mark attendance: scan the QR or enter the 4-digit code."],
  ["Late ho to abhi attendance laga lo.", "If you are late, mark your attendance now."],
  ["Sahi email daalo (jaise name@gmail.com)", "Enter a valid email (e.g. name@gmail.com)"],
  ["Temporary / fake email nahi chalega. Apna asli email daalo", "Temporary / fake emails are not allowed. Enter your real email"],
  ["Ye Gmail address sahi nahi hai. Gmail ka naam 6 se 30 akshar ka hota hai (a-z, 0-9, dot)", "This Gmail address is not valid. A Gmail name is 6 to 30 characters (a-z, 0-9, dot)"],
  ["Saved login nahi mila", "Saved login not found"],
  ["Logout ho gaya", "Logged out"],
  // webauthn ke andar ke messages ("Lock set nahi ho paya: ..." ke baad dikhte hain)
  ["CBOR: bahut bada array", "CBOR: array too large"],
  ["CBOR: bahut bada map", "CBOR: map too large"],
  ["CBOR: ye type samajh nahi aaya", "CBOR: unknown type"],
  ["authData chhota hai", "authData is too short"],
  ["Credential data nahi mila", "Credential data not found"],
  ["Public key sahi nahi hai", "The public key is not valid"],
  ["Is phone ka lock type abhi supported nahi hai", "This phone's lock type is not supported yet"],
  ["clientData sahi nahi hai", "clientData is not valid"],
  ["Galat type", "Wrong type"],
  ["Challenge match nahi hua", "Challenge did not match"],
  ["Origin sahi nahi hai", "Origin is not valid"],
  ["Site ka naam match nahi hua", "Site name did not match"],
  ["attestation sahi nahi hai", "attestation is not valid"],
  ["Phone ne user ko check nahi kiya", "The phone did not verify the user"],
  ["Fingerprint/face/PIN se verify nahi hua", "Could not verify with fingerprint/face/PIN"],
  ["Signature match nahi hua", "Signature did not match"],
  ["Phone ka counter galat hai", "The phone's counter is wrong"],
  // JSX me tute hue hisse (Planner, Bulk upload, Admin) - agar poora text ek node me na aaye
  ["Pichhle 7 din me", "In the last 7 days,"],
  ["suspicious ghatna hui.", "suspicious events happened."],
  ["Sabse naye", "Newest"],
  ["record dikh rahe hai, kul", "records shown, total"],
  ["% se upar rahoge.", "% - you will stay above this."],
  ["se neeche chale jaoge.", "- you will drop below this."],
  ["class tak chhod sakte ho.", "classes."],
  ["class aur attend karni hogi.", "more classes."],
  ["ab koi class chhodna mat.", "do not skip any more classes."],
  ["students ban gaye.", "students created."],
  ["nahi bane.", "were not created."],
  ["students banao", "students"],
  ["Ek baar me", "At a time,"],
  ["se zyada student nahi", "students at most"],
  ["File ko hisso me baant do.", "Split the file into parts."],
];

const MORE_PATTERNS_2 = [
  [/^Nayi leave request: (.*)$/, 'New leave request: $1'],
  [/^(.*) se (.*)\. Dekhne ke liye kholo\.$/, '$1 to $2. Open to view.'],
  [/^(.*)\. Dekhne ke liye kholo\.$/, '$1. Open to view.'],
  [/^(.*) ki class shuru ho gayi$/, '$1 class has started'],
  [/^(.*) ki attendance dobara khuli hai$/, 'Attendance has reopened for $1'],
  [/^Email me galti lag rahi hai\. Kya tumhara matlab (.*) hai\?$/, 'There seems to be a typo in the email. Did you mean $1?'],
  [/^Is email ka domain \((.*)\) asli nahi lag raha\. Email dobara check karo$/, 'The email domain ($1) does not look real. Please check the email again'],
  [/^([\d.]+)% hai\. (\d+)% ke liye lagatar (\d+) class aur attend karo\.$/, 'You are at $1%. To reach $2% attend $3 more classes in a row.'],
  [/^Abhi ([\d.]+)%$/, 'Now $1%'],
  [/^(.*) ka lock hata diya\. Wo dobara ON kar sakta hai$/, '$1\'s lock was removed. They can turn it ON again'],
  [/^(.*) ne abhi lock ON nahi kiya tha$/, '$1 had not turned the lock ON yet'],
];

// "Lock set nahi ho paya: <webauthn message>" - pehle se maujood pattern poora text pakad leta hai, isliye har message ka alag pattern
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const WA_PATTERNS = MORE_PAIRS_2
  .filter((p) => /^(CBOR:|authData|Credential data|Public key|Is phone ka lock type|clientData|Galat type|Challenge|Origin|Site ka naam|attestation|Phone ne user|Fingerprint\/face\/PIN|Signature|Phone ka counter)/.test(p[0]))
  .map((p) => [new RegExp('^Lock set nahi ho paya: ' + esc(p[0]) + '$'), 'Could not set up the lock: ' + p[1]]);

export function registerMore(pairs, patterns) {
  MORE_PATTERNS.concat(MORE_PATTERNS_2, WA_PATTERNS).reverse().forEach((p) => patterns.unshift(p));
  MORE_PAIRS.concat(MORE_PAIRS_2).forEach((p) => pairs.push(p));
}