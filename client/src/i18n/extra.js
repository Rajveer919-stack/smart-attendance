// Naye features aur server ke messages ka Hinglish -> English.
// translate.js isko khud jod leta hai (registerExtra).

const EXTRA_PAIRS = [
  // ---- Naye pages ----
  ["Lal dotted line 75% hai. Jis din class nahi hui wahan patli grey line hai.", "The red dotted line is 75%. A thin grey line means no class was held that day."],
  ["Sabse kam attendance wale subject", "Subjects with the lowest attendance"],
  ["Sabse kam attendance wale students", "Students with the lowest attendance"],
  ["Koi student 75% se neeche nahi hai.", "No student is below 75%."],
  ["Is period me koi class nahi hui.", "No class was held in this period."],
  ["Pichhle 14 din ka trend", "Last 14 days trend"],
  ["Abhi koi data nahi hai.", "No data yet."],
  ["Poora overview", "Full overview"],
  ["Refresh karo", "Refresh"],
  ["Kis date se", "From date"],
  ["Kis date tak", "To date"],
  ["Filter lagao", "Apply filter"],
  ["Excel download", "Download Excel"],
  ["Ban rahi hai...", "Preparing..."],
  ["Din-wise classes", "Classes by day"],
  ["Attendance badlo", "Edit attendance"],
  ["Edit karo", "Edit"],
  ["Excel nahi ban payi", "Could not create the Excel file"],
  ["Naam ya roll number", "Name or roll number"],
  ["Haath se lagayi, ", "Marked manually, "],
  ["QR se, ", "By QR, "],
  ["Pichhla mahina", "Previous month"],
  ["Agla mahina", "Next month"],
  ["Is mahine", "This month"],
  ["Class nahi hui", "No class"],
  ["Calendar dekho", "View calendar"],

  // ---- Server ke messages ----
  ["Login karo pehle (token nahi mila)", "Please log in first (no token found)"],
  ["Tumhe is kaam ki permission nahi hai", "You do not have permission to do this"],
  ["Token invalid ya expire ho gaya", "Token is invalid or has expired"],
  ["User exist nahi karta", "User does not exist"],
  ["name, code, department, semester aur teacher zaroori hai", "name, code, department, semester and teacher are required"],
  ["Is device se is session me pehle hi attendance lag chuki hai", "Attendance has already been marked from this device in this session"],
  ["Is student ki attendance pehle se hai, dobara try karo", "This student's attendance already exists, please try again"],
  ["QR expire ho gaya, naya QR scan karo", "The QR code has expired, scan the new QR code"],
  ["Ye class ka session band ho chuka hai", "This class session has ended"],
  ["Ye subject tumhare class ka nahi hai", "This subject does not belong to your class"],
  ["status present ya absent hona chahiye", "Status must be present or absent"],
  ["Tumhari attendance pehle hi lag chuki hai", "Your attendance is already marked"],
  ["Ye student is class ka nahi hai", "This student does not belong to this class"],
  ["token aur deviceId zaroori hai", "token and deviceId are required"],
  ["Is code ka subject pehle se hai", "A subject with this code already exists"],
  ["Ye session band ho chuka hai", "This session has already ended"],
  ["Ye session tumhara nahi hai", "This session is not yours"],
  ["Ye subject tumhara nahi hai", "This subject is not assigned to you"],
  ["Ye teacher ID sahi nahi hai", "Invalid teacher ID"],
  ["Subject ID sahi nahi hai", "Invalid subject ID"],
  ["Session ID sahi nahi hai", "Invalid session ID"],
  ["Session band ho gaya", "Session ended"],
  ["Ye sahi QR nahi hai", "This is not a valid QR code"],
  ["subjectId zaroori hai", "subjectId is required"],
  ["Attendance lag gayi", "Attendance marked"],
  ["Session nahi mila", "Session not found"],
  ["Subject nahi mila", "Subject not found"],
  ["QR sahi nahi hai", "The QR code is not valid"],
  ["ID sahi nahi hai", "Invalid ID"]
];

const EXTRA_PATTERNS = [
  [/^(.*): (Present|Absent) kar diya$/, '$1: marked $2']
];

export function registerExtra(pairs, patterns) {
  EXTRA_PAIRS.forEach((p) => pairs.push(p));
  EXTRA_PATTERNS.forEach((p) => patterns.push(p));
  // Lambe phrase pehle, taaki wo chhote phrase se pehle match ho
  pairs.sort((a, b) => b[0].length - a[0].length);
}