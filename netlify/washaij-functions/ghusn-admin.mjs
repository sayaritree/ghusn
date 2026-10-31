import { getStore, getDeployStore } from '@netlify/blobs';
import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';

/*
 * غُصن — إدارة الأنساب. لا تحفظ كلمة مرور في الواجهة أو مستودع GitHub.
 * يُضبط GHUSN_ADMIN_SECRET (قيمة عشوائية طويلة لا تقل عن 18 حرفًا) في
 * Netlify > Environment Variables > Functions.
 * يحفظ الخادم المسودات والنسخ المعتمدة بمعرّفات الأشخاص، لا بالأسماء.
 */
const COOKIE='ghusn_editor_session';
const MAX_AGE=8*60*60;
const ALLOWED=['name','birth','death','father','mother','sons','daughters','brothers','sisters','partners','source','notes'];
const PUBLIC=['name','birth','death','source','notes'];
const ID_RE=/^[0-9]{1,12}$/;

/* Immutable source roster: extracted from the approved Washaij tree.
 * A person's ID is the only genealogy key; matching names never creates a link.
 */
const ROSTER=[{"id":"1","name":"الشيخ محمد رحمه الله","gender":"ولد","fatherId":"4","motherId":"5","spouseIds":["2","3"]},{"id":"2","name":"هيلة عبدالله ناصر السويد","gender":"بنت","fatherId":"6","motherId":"7","spouseIds":["1"]},{"id":"3","name":"فاطمة عبدالرحمن الشهوان","gender":"بنت","fatherId":"8","motherId":"9","spouseIds":["1"]},{"id":"4","name":"عبدالله عبدالعزيز السياري","gender":"ولد","fatherId":"38","motherId":"60","spouseIds":["5"]},{"id":"38","name":"عبدالعزيز عبدالله السياري","gender":"ولد","fatherId":"10","motherId":"","spouseIds":[]},{"id":"10","name":"عبدالله بن ناصر السياري","gender":"ولد","fatherId":"11","motherId":"","spouseIds":[]},{"id":"11","name":"ناصر محمد السياري","gender":"ولد","fatherId":"12","motherId":"","spouseIds":[]},{"id":"1147","name":"عبدالعزيز محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["1153"]},{"id":"1148","name":"إبراهيم محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["1155"]},{"id":"1149","name":"ناصر محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["1156"]},{"id":"1150","name":"عبدالله محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["1157"]},{"id":"501","name":"سلطان محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["102"]},{"id":"502","name":"سعد محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1158","motherId":"1152","spouseIds":["104"]},{"id":"1151","name":"نورة بنت محمد ناصر محمد عثمان السياري","gender":"بنت","fatherId":"1158","motherId":"1152","spouseIds":["1132"]},{"id":"1158","name":"محمد ناصر محمد ناصر السياري","gender":"ولد","fatherId":"1159","motherId":"","spouseIds":[]},{"id":"1159","name":"ناصر محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"1160","motherId":"","spouseIds":[]},{"id":"1160","name":"محمد ناصر محمد عثمان السياري","gender":"ولد","fatherId":"11","motherId":"","spouseIds":[]},{"id":"12","name":"محمد عثمان عثمان السياري","gender":"ولد","fatherId":"33","motherId":"","spouseIds":[]},{"id":"33","name":"عثمان بن عثمان السياري","gender":"ولد","fatherId":"1154","motherId":"","spouseIds":[]},{"id":"6","name":"عبدالله ناصر السويد","gender":"ولد","fatherId":"13","motherId":"","spouseIds":["7"]},{"id":"13","name":"ناصر السويد","gender":"ولد","fatherId":"","motherId":"","spouseIds":[]},{"id":"7","name":"منيرة عبدالعزيز عثمان النمي","gender":"بنت","fatherId":"14","motherId":"","spouseIds":["6"]},{"id":"14","name":"عبدالعزيز عثمان النمي","gender":"ولد","fatherId":"34","motherId":"","spouseIds":[]},{"id":"5","name":"منيرة محمد شتوي السياري","gender":"بنت","fatherId":"15","motherId":"64","spouseIds":["4"]},{"id":"15","name":"محمد شتوي السياري","gender":"ولد","fatherId":"35","motherId":"","spouseIds":["64"]},{"id":"8","name":"عبدالرحمن الشهوان","gender":"ولد","fatherId":"","motherId":"","spouseIds":["9"]},{"id":"9","name":"نورة الباحوث","gender":"بنت","fatherId":"","motherId":"","spouseIds":["8"]},{"id":"16","name":"ناصر عبدالله السويد","gender":"ولد","fatherId":"6","motherId":"7","spouseIds":["39"]},{"id":"17","name":"عبدالعزيز الحمد","gender":"ولد","fatherId":"97","motherId":"93","spouseIds":[]},{"id":"18","name":"لطيفة بنت عبدالله السويد","gender":"بنت","fatherId":"6","motherId":"7","spouseIds":["40"]},{"id":"19","name":"هيا بنت عبدالله السويد","gender":"بنت","fatherId":"6","motherId":"7","spouseIds":["41"]},{"id":"20","name":"هيا محمد بن شتوي السياري","gender":"بنت","fatherId":"15","motherId":"64","spouseIds":["29"]},{"id":"21","name":"مريم راشد الراشد","gender":"بنت","fatherId":"36","motherId":"5","spouseIds":["62"]},{"id":"23","name":"عبدالله الشلال","gender":"ولد","fatherId":"62","motherId":"21","spouseIds":[]},{"id":"22","name":"عبدالعزيز العنقري","gender":"ولد","fatherId":"61","motherId":"21","spouseIds":[]},{"id":"24","name":"عثمان إبراهيم العثيم","gender":"ولد","fatherId":"63","motherId":"21","spouseIds":[]},{"id":"25","name":"حصه بنت عبدالعزيز عبدالله السياري","gender":"بنت","fatherId":"38","motherId":"43","spouseIds":["42"]},{"id":"42","name":"علي الراشد","gender":"ولد","fatherId":"","motherId":"","spouseIds":["25"]},{"id":"68","name":"عثمان عبدالوهاب بن زاحم","gender":"ولد","fatherId":"70","motherId":"91","spouseIds":["25"]},{"id":"69","name":"لطيفة عثمان عبدالوهاب بن زاحم","gender":"بنت","fatherId":"68","motherId":"25","spouseIds":["71"]},{"id":"26","name":"عبدالله علي الراشد","gender":"ولد","fatherId":"42","motherId":"25","spouseIds":[]},{"id":"27","name":"محمد علي الراشد","gender":"ولد","fatherId":"42","motherId":"25","spouseIds":[]},{"id":"28","name":"عبدالعزيز علي الراشد","gender":"ولد","fatherId":"42","motherId":"25","spouseIds":[]},{"id":"67","name":"منيرة علي الراشد","gender":"بنت","fatherId":"42","motherId":"25","spouseIds":[]},{"id":"29","name":"الشيخ عبدالرحمن عبدالله محمد الفنتوخ","gender":"ولد","fatherId":"37","motherId":"","spouseIds":["20"]},{"id":"65","name":"نورة عبدالرحمن الفنتوخ","gender":"بنت","fatherId":"29","motherId":"20","spouseIds":["66"]},{"id":"30","name":"الشيخ عبدالله عبدالرحمن الفنتوخ","gender":"ولد","fatherId":"29","motherId":"20","spouseIds":[]},{"id":"72","name":"حصه عبدالرحمن الفنتوخ","gender":"بنت","fatherId":"29","motherId":"20","spouseIds":["73"]},{"id":"31","name":"عبدالقادر الفنتوخ","gender":"ولد","fatherId":"30","motherId":"","spouseIds":[]},{"id":"32","name":"عبدالرحمن الفنتوخ","gender":"ولد","fatherId":"30","motherId":"","spouseIds":["56"]},{"id":"92","name":"علي عبدالعزيز المنيع","gender":"ولد","fatherId":"66","motherId":"65","spouseIds":[]},{"id":"44","name":"عبدالرحمن عبدالله عبدالعزيز السياري","gender":"ولد","fatherId":"4","motherId":"5","spouseIds":[]},{"id":"45","name":"نورة عبدالله عبدالعزيز السياري","gender":"بنت","fatherId":"4","motherId":"5","spouseIds":["46"]},{"id":"47","name":"الشيخ عبدالله بن إبراهيم الجريان","gender":"ولد","fatherId":"46","motherId":"45","spouseIds":["48"]},{"id":"49","name":"عبدالرحمن إبراهيم الجريان","gender":"ولد","fatherId":"46","motherId":"45","spouseIds":["59"]},{"id":"50","name":"عبدالعزيز إبراهيم الجريان","gender":"ولد","fatherId":"46","motherId":"45","spouseIds":["96"]},{"id":"51","name":"ناصر إبراهيم الجريان","gender":"ولد","fatherId":"46","motherId":"45","spouseIds":[]},{"id":"52","name":"صالح إبراهيم الجريان","gender":"ولد","fatherId":"46","motherId":"45","spouseIds":[]},{"id":"54","name":"منيرة إبراهيم الجريان","gender":"بنت","fatherId":"46","motherId":"45","spouseIds":["58"]},{"id":"55","name":"سارة إبراهيم الجريان","gender":"بنت","fatherId":"46","motherId":"45","spouseIds":["57"]},{"id":"56","name":"حصه إبراهيم الجريان","gender":"بنت","fatherId":"46","motherId":"45","spouseIds":["32"]},{"id":"601","name":"هيلة إبراهيم الجريان","gender":"بنت","fatherId":"46","motherId":"45","spouseIds":["101"]},{"id":"53","name":"فاطمة إبراهيم الجريان","gender":"بنت","fatherId":"46","motherId":"45","spouseIds":["90"]},{"id":"43","name":"هيا الشعلان","gender":"بنت","fatherId":"74","motherId":"75","spouseIds":["38"]},{"id":"78","name":"لطيفة عبدالعزيز عبدالله السياري","gender":"بنت","fatherId":"38","motherId":"43","spouseIds":["85"]},{"id":"60","name":"الشعلانيه (1)  أم جدي عبدالله السياري","gender":"بنت","fatherId":"76","motherId":"77","spouseIds":["38"]},{"id":"64","name":"نورة الزاحم زوجة محمد بن شتوي السياري","gender":"بنت","fatherId":"","motherId":"","spouseIds":["15"]},{"id":"79","name":"الزاحم","gender":"ولد","fatherId":"","motherId":"","spouseIds":[]},{"id":"80","name":"هيا الزاحم بنت الشعلانيه (1)","gender":"بنت","fatherId":"79","motherId":"60","spouseIds":["81"]},{"id":"81","name":"الشيخ عبدالله عبدالوهاب بن زاحم","gender":"ولد","fatherId":"70","motherId":"91","spouseIds":["80"]},{"id":"82","name":"إبراهيم بن زاحم","gender":"ولد","fatherId":"81","motherId":"80","spouseIds":[]},{"id":"83","name":"بن شعلان","gender":"ولد","fatherId":"","motherId":"","spouseIds":["78"]},{"id":"84","name":"نورة الشعلان","gender":"بنت","fatherId":"83","motherId":"78","spouseIds":[]},{"id":"85","name":"عثمان المقحم","gender":"ولد","fatherId":"","motherId":"","spouseIds":["78"]},{"id":"86","name":"محمد عثمان المقحم","gender":"ولد","fatherId":"85","motherId":"78","spouseIds":[]},{"id":"87","name":"يحيى عثمان المقحم","gender":"ولد","fatherId":"85","motherId":"78","spouseIds":[]},{"id":"88","name":"عبدالعزيز عثمان المقحم","gender":"ولد","fatherId":"85","motherId":"78","spouseIds":[]},{"id":"89","name":"سارة عثمان المقحم","gender":"بنت","fatherId":"85","motherId":"78","spouseIds":[]},{"id":"70","name":"عبدالوهاب بن زاحم","gender":"ولد","fatherId":"","motherId":"","spouseIds":["91"]},{"id":"91","name":"أم عبدالله عبدالوهاب بن زاحم","gender":"بنت","fatherId":"","motherId":"","spouseIds":["70"]},{"id":"93","name":"هيلة عبدالعزيز عثمان النمي","gender":"بنت","fatherId":"14","motherId":"","spouseIds":["98"]},{"id":"94","name":"عبدالرحمن عبدالعزيز عثمان النمي","gender":"ولد","fatherId":"14","motherId":"","spouseIds":[]},{"id":"95","name":"عبدالله عبدالعزيز عثمان النمي","gender":"ولد","fatherId":"14","motherId":"","spouseIds":[]},{"id":"1101","name":"عبدالله بن ناصر بن عبدالله السويد","gender":"ولد","fatherId":"16","motherId":"39","spouseIds":[]},{"id":"1102","name":"أحمد بن ناصر بن عبدالله السويد","gender":"ولد","fatherId":"16","motherId":"39","spouseIds":[]},{"id":"1103","name":"محمد بن ناصر بن عبدالله السويد","gender":"ولد","fatherId":"16","motherId":"39","spouseIds":[]},{"id":"1104","name":"أمل بنت ناصر بن عبدالله السويد","gender":"بنت","fatherId":"16","motherId":"39","spouseIds":[]},{"id":"1105","name":"عبدالعزيز بن عبدالرحمن بن عبدالعزيز النمي","gender":"ولد","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1106","name":"محمد بن عبدالرحمن بن عبدالعزيز النمي","gender":"ولد","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1107","name":"هيا بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1108","name":"منيرة بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1109","name":"هيلة بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1110","name":"سارة بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1111","name":"الجوهرة بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1112","name":"حصة بنت عبدالرحمن بن عبدالعزيز النمي","gender":"بنت","fatherId":"94","motherId":"1145","spouseIds":[]},{"id":"1113","name":"عبدالعزيز بن عبدالله بن عبدالعزيز النمي","gender":"ولد","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1114","name":"عبدالرحمن بن عبدالله بن عبدالعزيز النمي","gender":"ولد","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1115","name":"صالح بن عبدالله بن عبدالعزيز النمي","gender":"ولد","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1116","name":"خالد بن عبدالله بن عبدالعزيز النمي","gender":"ولد","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1117","name":"بندر بن عبدالله بن عبدالعزيز النمي","gender":"ولد","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1118","name":"نورة بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1119","name":"حصة بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1120","name":"سارة بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1121","name":"فوزية بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1122","name":"أمل بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1123","name":"تهاني بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"1124","name":"مها بنت عبدالله بن عبدالعزيز النمي","gender":"بنت","fatherId":"95","motherId":"1146","spouseIds":[]},{"id":"503","name":"إبراهيم بن محمد بن إبراهيم الغدير","gender":"ولد","fatherId":"40","motherId":"18","spouseIds":["105"]},{"id":"1126","name":"صالح بن محمد بن إبراهيم الغدير","gender":"ولد","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"1127","name":"عبدالله بن محمد بن إبراهيم الغدير","gender":"ولد","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"1128","name":"فاطمة بنت محمد بن إبراهيم الغدير","gender":"بنت","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"1129","name":"سارة بنت محمد بن إبراهيم الغدير","gender":"بنت","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"1130","name":"هيلة بنت محمد بن إبراهيم الغدير","gender":"بنت","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"1131","name":"منيرة بنت محمد بن إبراهيم الغدير","gender":"بنت","fatherId":"40","motherId":"18","spouseIds":[]},{"id":"604","name":"هيا بنت محمد بن إبراهيم الغدير","gender":"بنت","fatherId":"40","motherId":"18","spouseIds":["107"]},{"id":"1133","name":"عبدالرحمن بن فايز بن عبدالله السويد","gender":"ولد","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1134","name":"ناصر بن فايز بن عبدالله السويد","gender":"ولد","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1135","name":"فواز بن فايز بن عبدالله السويد","gender":"ولد","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1136","name":"فيصل بن فايز بن عبدالله السويد","gender":"ولد","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1137","name":"بدر بن فايز بن عبدالله السويد","gender":"ولد","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1138","name":"شريفة بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1139","name":"لطيفة بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1140","name":"عزيزة بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1141","name":"هدى بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1142","name":"خلود بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"1143","name":"نورة بنت فايز بن عبدالله السويد","gender":"بنت","fatherId":"41","motherId":"19","spouseIds":[]},{"id":"99","name":"محمد","gender":"ولد","fatherId":"98","motherId":"93","spouseIds":[]},{"id":"100","name":"نورة","gender":"بنت","fatherId":"98","motherId":"93","spouseIds":[]},{"id":"101","name":"عبدالعزيز","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["601","602"]},{"id":"102","name":"نورة","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":["501"]},{"id":"103","name":"عبدالرحمن","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["603"]},{"id":"104","name":"حصه","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":["502"]},{"id":"105","name":"منيرة","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":["503"]},{"id":"106","name":"فاطمة","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":["504"]},{"id":"107","name":"عبدالله","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["604"]},{"id":"108","name":"ناصر","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["605"]},{"id":"109","name":"سلطان","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["606"]},{"id":"110","name":"الجوهرة","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":["505"]},{"id":"111","name":"احمد","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["607"]},{"id":"112","name":"حسن","gender":"ولد","fatherId":"1","motherId":"2","spouseIds":["608"]},{"id":"113","name":"عبير","gender":"بنت","fatherId":"1","motherId":"2","spouseIds":[]},{"id":"114","name":"فهد","gender":"ولد","fatherId":"1","motherId":"3","spouseIds":["609"]},{"id":"115","name":"سعد","gender":"ولد","fatherId":"1","motherId":"3","spouseIds":["610","613"]},{"id":"116","name":"خالد","gender":"ولد","fatherId":"1","motherId":"3","spouseIds":["611"]},{"id":"117","name":"إبراهيم","gender":"ولد","fatherId":"1","motherId":"3","spouseIds":["612"]},{"id":"118","name":"منى","gender":"بنت","fatherId":"1","motherId":"3","spouseIds":["506"]},{"id":"201","name":"محمد","gender":"ولد","fatherId":"101","motherId":"602","spouseIds":[]},{"id":"202","name":"خالد","gender":"ولد","fatherId":"101","motherId":"602","spouseIds":[]},{"id":"203","name":"دنا","gender":"بنت","fatherId":"101","motherId":"602","spouseIds":["715"]},{"id":"901","name":"مساعد - رحمه الله -","gender":"ولد","fatherId":"","motherId":"601","spouseIds":[]},{"id":"204","name":"خالد","gender":"ولد","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"205","name":"فيصل","gender":"ولد","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"206","name":"تركي","gender":"ولد","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"207","name":"محمد","gender":"ولد","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"208","name":"رناد","gender":"بنت","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"209","name":"ريوف","gender":"بنت","fatherId":"103","motherId":"603","spouseIds":[]},{"id":"210","name":"مشاري","gender":"ولد","fatherId":"107","motherId":"604","spouseIds":["801"]},{"id":"211","name":"نواف","gender":"ولد","fatherId":"107","motherId":"604","spouseIds":[]},{"id":"212","name":"معاذ","gender":"ولد","fatherId":"107","motherId":"604","spouseIds":[]},{"id":"213","name":"خالد","gender":"ولد","fatherId":"107","motherId":"604","spouseIds":[]},{"id":"214","name":"رهف","gender":"بنت","fatherId":"107","motherId":"604","spouseIds":["701"]},{"id":"215","name":"سديف","gender":"بنت","fatherId":"107","motherId":"604","spouseIds":[]},{"id":"216","name":"محمد","gender":"ولد","fatherId":"108","motherId":"605","spouseIds":[]},{"id":"217","name":"إبراهيم","gender":"ولد","fatherId":"108","motherId":"605","spouseIds":[]},{"id":"218","name":"مهند","gender":"ولد","fatherId":"108","motherId":"605","spouseIds":[]},{"id":"219","name":"بيان","gender":"بنت","fatherId":"108","motherId":"605","spouseIds":["702"]},{"id":"220","name":"بشرى","gender":"بنت","fatherId":"108","motherId":"605","spouseIds":["703"]},{"id":"221","name":"أسامة","gender":"ولد","fatherId":"109","motherId":"606","spouseIds":[]},{"id":"222","name":"جود","gender":"بنت","fatherId":"109","motherId":"606","spouseIds":[]},{"id":"223","name":"باسل","gender":"ولد","fatherId":"111","motherId":"607","spouseIds":[]},{"id":"224","name":"طارق","gender":"ولد","fatherId":"111","motherId":"607","spouseIds":[]},{"id":"225","name":"محمد","gender":"ولد","fatherId":"111","motherId":"607","spouseIds":[]},{"id":"226","name":"ربى","gender":"بنت","fatherId":"111","motherId":"607","spouseIds":[]},{"id":"227","name":"فارس","gender":"ولد","fatherId":"112","motherId":"608","spouseIds":[]},{"id":"228","name":"محمد","gender":"ولد","fatherId":"112","motherId":"608","spouseIds":[]},{"id":"229","name":"عبدالرحمن","gender":"ولد","fatherId":"112","motherId":"608","spouseIds":[]},{"id":"230","name":"فيصل","gender":"ولد","fatherId":"112","motherId":"608","spouseIds":[]},{"id":"231","name":"ريما","gender":"بنت","fatherId":"112","motherId":"608","spouseIds":[]},{"id":"232","name":"لينا","gender":"بنت","fatherId":"114","motherId":"609","spouseIds":[]},{"id":"233","name":"ريما","gender":"بنت","fatherId":"114","motherId":"609","spouseIds":[]},{"id":"234","name":"تالا","gender":"بنت","fatherId":"114","motherId":"609","spouseIds":[]},{"id":"235","name":"خالد","gender":"ولد","fatherId":"115","motherId":"610","spouseIds":[]},{"id":"236","name":"فهد","gender":"ولد","fatherId":"115","motherId":"610","spouseIds":[]},{"id":"237","name":"إبراهيم","gender":"ولد","fatherId":"115","motherId":"610","spouseIds":[]},{"id":"238","name":"محمد","gender":"ولد","fatherId":"115","motherId":"610","spouseIds":[]},{"id":"239","name":"العنود","gender":"بنت","fatherId":"115","motherId":"610","spouseIds":[]},{"id":"240","name":"عبدالوهاب","gender":"ولد","fatherId":"115","motherId":"613","spouseIds":[]},{"id":"241","name":"الوليد","gender":"ولد","fatherId":"116","motherId":"611","spouseIds":[]},{"id":"242","name":"فاطمة","gender":"بنت","fatherId":"116","motherId":"611","spouseIds":[]},{"id":"243","name":"لطيفة","gender":"بنت","fatherId":"116","motherId":"611","spouseIds":[]},{"id":"244","name":"محمد","gender":"ولد","fatherId":"117","motherId":"612","spouseIds":[]},{"id":"245","name":"فاطمة","gender":"بنت","fatherId":"117","motherId":"612","spouseIds":[]},{"id":"246","name":"محمد","gender":"ولد","fatherId":"501","motherId":"102","spouseIds":["802"]},{"id":"247","name":"بدر","gender":"ولد","fatherId":"501","motherId":"102","spouseIds":["803"]},{"id":"248","name":"عبدالله","gender":"ولد","fatherId":"501","motherId":"102","spouseIds":["269"]},{"id":"249","name":"عبدالرحمن","gender":"ولد","fatherId":"501","motherId":"102","spouseIds":["804"]},{"id":"250","name":"عبدالعزيز","gender":"ولد","fatherId":"501","motherId":"102","spouseIds":[]},{"id":"251","name":"حصه","gender":"بنت","fatherId":"501","motherId":"102","spouseIds":["704"]},{"id":"252","name":"حنان","gender":"بنت","fatherId":"501","motherId":"102","spouseIds":["705"]},{"id":"253","name":"لجين","gender":"بنت","fatherId":"501","motherId":"102","spouseIds":["706"]},{"id":"254","name":"محمد","gender":"ولد","fatherId":"502","motherId":"104","spouseIds":["805"]},{"id":"255","name":"عبدالرحمن","gender":"ولد","fatherId":"502","motherId":"104","spouseIds":["806"]},{"id":"256","name":"عبدالعزيز","gender":"ولد","fatherId":"502","motherId":"104","spouseIds":["807"]},{"id":"257","name":"عبدالله","gender":"ولد","fatherId":"502","motherId":"104","spouseIds":[]},{"id":"258","name":"نوف","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["707"]},{"id":"259","name":"ندى","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["708"]},{"id":"260","name":"نجد","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["709"]},{"id":"261","name":"العنود","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["710"]},{"id":"262","name":"عهود","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["711"]},{"id":"263","name":"رند","gender":"بنت","fatherId":"502","motherId":"104","spouseIds":["712"]},{"id":"264","name":"محمد","gender":"ولد","fatherId":"503","motherId":"105","spouseIds":["808"]},{"id":"265","name":"عبدالله","gender":"ولد","fatherId":"503","motherId":"105","spouseIds":["809"]},{"id":"266","name":"عبدالمجيد","gender":"ولد","fatherId":"503","motherId":"105","spouseIds":["810"]},{"id":"267","name":"عبدالإله","gender":"ولد","fatherId":"503","motherId":"105","spouseIds":[]},{"id":"268","name":"أروى","gender":"بنت","fatherId":"503","motherId":"105","spouseIds":["713"]},{"id":"269","name":"أسماء","gender":"بنت","fatherId":"503","motherId":"105","spouseIds":["248"]},{"id":"270","name":"أثير","gender":"بنت","fatherId":"503","motherId":"105","spouseIds":[]},{"id":"271","name":"عبدالله","gender":"ولد","fatherId":"504","motherId":"106","spouseIds":[]},{"id":"272","name":"عبدالعزيز","gender":"ولد","fatherId":"504","motherId":"106","spouseIds":[]},{"id":"273","name":"يوسف","gender":"ولد","fatherId":"504","motherId":"106","spouseIds":["811"]},{"id":"274","name":"لمى","gender":"بنت","fatherId":"504","motherId":"106","spouseIds":["714"]},{"id":"275","name":"رنا","gender":"بنت","fatherId":"504","motherId":"106","spouseIds":[]},{"id":"276","name":"رؤى","gender":"بنت","fatherId":"504","motherId":"106","spouseIds":[]},{"id":"277","name":"لين","gender":"بنت","fatherId":"504","motherId":"106","spouseIds":[]},{"id":"278","name":"عبدالعزيز","gender":"ولد","fatherId":"505","motherId":"110","spouseIds":[]},{"id":"279","name":"محمد","gender":"ولد","fatherId":"505","motherId":"110","spouseIds":["812"]},{"id":"280","name":"تركي","gender":"ولد","fatherId":"505","motherId":"110","spouseIds":[]},{"id":"281","name":"طلال","gender":"ولد","fatherId":"505","motherId":"110","spouseIds":[]},{"id":"282","name":"شادن","gender":"بنت","fatherId":"505","motherId":"110","spouseIds":[]},{"id":"283","name":"داليا","gender":"بنت","fatherId":"505","motherId":"110","spouseIds":[]},{"id":"284","name":"منيرة","gender":"بنت","fatherId":"506","motherId":"118","spouseIds":[]},{"id":"285","name":"جوانا","gender":"بنت","fatherId":"506","motherId":"118","spouseIds":[]},{"id":"286","name":"لانا","gender":"بنت","fatherId":"506","motherId":"118","spouseIds":[]},{"id":"287","name":"تمارا","gender":"بنت","fatherId":"506","motherId":"118","spouseIds":[]},{"id":"288","name":"نورة","gender":"بنت","fatherId":"506","motherId":"118","spouseIds":[]},{"id":"301","name":"عبدالله","gender":"ولد","fatherId":"210","motherId":"801","spouseIds":[]},{"id":"302","name":"لارين","gender":"بنت","fatherId":"701","motherId":"214","spouseIds":[]},{"id":"303","name":"عبدالعزيز","gender":"ولد","fatherId":"702","motherId":"219","spouseIds":[]},{"id":"304","name":"ناصر","gender":"ولد","fatherId":"702","motherId":"219","spouseIds":[]},{"id":"305","name":"هيا","gender":"بنت","fatherId":"702","motherId":"219","spouseIds":[]},{"id":"306","name":"نايف","gender":"ولد","fatherId":"703","motherId":"220","spouseIds":[]},{"id":"307","name":"سارة","gender":"بنت","fatherId":"703","motherId":"220","spouseIds":[]},{"id":"308","name":"سلطان","gender":"ولد","fatherId":"246","motherId":"802","spouseIds":[]},{"id":"309","name":"عبدالعزيز","gender":"ولد","fatherId":"246","motherId":"802","spouseIds":[]},{"id":"310","name":"دينا","gender":"بنت","fatherId":"246","motherId":"802","spouseIds":[]},{"id":"311","name":"لانا","gender":"بنت","fatherId":"246","motherId":"802","spouseIds":[]},{"id":"312","name":"نورة","gender":"بنت","fatherId":"247","motherId":"803","spouseIds":[]},{"id":"313","name":"موضي","gender":"بنت","fatherId":"247","motherId":"803","spouseIds":[]},{"id":"314","name":"وليد","gender":"ولد","fatherId":"247","motherId":"803","spouseIds":[]},{"id":"315","name":"عبدالرحمن","gender":"ولد","fatherId":"247","motherId":"803","spouseIds":[]},{"id":"316","name":"فيصل","gender":"ولد","fatherId":"248","motherId":"269","spouseIds":[]},{"id":"317","name":"سلطان","gender":"ولد","fatherId":"248","motherId":"269","spouseIds":[]},{"id":"318","name":"تولين","gender":"بنت","fatherId":"248","motherId":"269","spouseIds":[]},{"id":"319","name":"ليان","gender":"بنت","fatherId":"248","motherId":"269","spouseIds":[]},{"id":"320","name":"سلطان","gender":"ولد","fatherId":"249","motherId":"804","spouseIds":[]},{"id":"321","name":"محمد","gender":"ولد","fatherId":"704","motherId":"251","spouseIds":[]},{"id":"322","name":"خالد","gender":"ولد","fatherId":"704","motherId":"251","spouseIds":[]},{"id":"323","name":"جوانا","gender":"بنت","fatherId":"704","motherId":"251","spouseIds":[]},{"id":"324","name":"ديم","gender":"بنت","fatherId":"704","motherId":"251","spouseIds":[]},{"id":"325","name":"فيء","gender":"بنت","fatherId":"704","motherId":"251","spouseIds":[]},{"id":"326","name":"عبدالعزيز","gender":"ولد","fatherId":"705","motherId":"252","spouseIds":[]},{"id":"327","name":"علياء","gender":"بنت","fatherId":"705","motherId":"252","spouseIds":[]},{"id":"328","name":"مها","gender":"بنت","fatherId":"706","motherId":"253","spouseIds":[]},{"id":"329","name":"سعد","gender":"ولد","fatherId":"255","motherId":"806","spouseIds":[]},{"id":"330","name":"حمد","gender":"ولد","fatherId":"707","motherId":"258","spouseIds":[]},{"id":"331","name":"غند","gender":"بنت","fatherId":"707","motherId":"258","spouseIds":[]},{"id":"332","name":"عبدالرحمن","gender":"ولد","fatherId":"708","motherId":"259","spouseIds":[]},{"id":"333","name":"معاذ","gender":"ولد","fatherId":"708","motherId":"259","spouseIds":[]},{"id":"334","name":"نورة","gender":"بنت","fatherId":"708","motherId":"259","spouseIds":[]},{"id":"335","name":"راكان","gender":"ولد","fatherId":"709","motherId":"260","spouseIds":[]},{"id":"336","name":"يارا","gender":"بنت","fatherId":"709","motherId":"260","spouseIds":[]},{"id":"337","name":"آية","gender":"بنت","fatherId":"710","motherId":"261","spouseIds":[]},{"id":"338","name":"لينا","gender":"بنت","fatherId":"710","motherId":"261","spouseIds":[]},{"id":"339","name":"إبراهيم","gender":"ولد","fatherId":"264","motherId":"808","spouseIds":[]},{"id":"340","name":"عبدالله","gender":"ولد","fatherId":"264","motherId":"808","spouseIds":[]},{"id":"341","name":"عالية","gender":"بنت","fatherId":"264","motherId":"808","spouseIds":[]},{"id":"342","name":"منيرة","gender":"بنت","fatherId":"264","motherId":"808","spouseIds":[]},{"id":"343","name":"حصه","gender":"بنت","fatherId":"264","motherId":"808","spouseIds":[]},{"id":"344","name":"أنس","gender":"ولد","fatherId":"266","motherId":"810","spouseIds":[]},{"id":"345","name":"علي","gender":"ولد","fatherId":"713","motherId":"268","spouseIds":[]},{"id":"346","name":"عبدالله","gender":"ولد","fatherId":"713","motherId":"268","spouseIds":[]},{"id":"347","name":"فرح","gender":"بنت","fatherId":"713","motherId":"268","spouseIds":[]},{"id":"348","name":"هيا","gender":"بنت","fatherId":"714","motherId":"274","spouseIds":[]}];
const BASE=new Map(ROSTER.map(x=>[x.id,x]));
const LINK_KEYS=['fatherId','motherId','childrenIds','spouseIds','lineageType','childTypes'];
const LINEAGE_TYPES=['marriage','biological','care','unknown'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function linkDraft(value){
 if(value===undefined||value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('روابط غير صحيحة');
 for(const k of Object.keys(value))if(!LINK_KEYS.includes(k))throw Error('حقل صلة غير معروف');
 const out={};
 for(const k of ['fatherId','motherId']){
   if(!own(value,k))throw Error('يلزم تحديد الأب والأم من القائمة أو خيار غير موثق');
   const id=String(value[k]??'');
   if(id&&!idOf(id))throw Error('معرّف قريب غير صحيح');
   out[k]=id;
 }
 for(const k of ['childrenIds','spouseIds']){
   if(!Array.isArray(value[k])||value[k].length>450)throw Error('قائمة روابط غير صحيحة');
   out[k]=value[k].map(x=>String(x));
   if(out[k].some(x=>!idOf(x))||new Set(out[k]).size!==out[k].length)throw Error('روابط مكررة أو غير صحيحة');
 }
 out.lineageType=String(value.lineageType||'marriage');
 if(!LINEAGE_TYPES.includes(out.lineageType))throw Error('نوع النسب غير صحيح');
 out.childTypes={};
 const types=value.childTypes||{};
 if(!types||typeof types!=='object'||Array.isArray(types))throw Error('أنواع صلات غير صحيحة');
 for(const [id,t] of Object.entries(types)){
   if(!idOf(id)||!out.childrenIds.includes(id)||!LINEAGE_TYPES.includes(t))throw Error('صلة ابن غير صحيحة');
   out.childTypes[id]=t;
 }
 return out;
}
function currentState(relationDocument){
 const state=new Map(ROSTER.map(p=>[p.id,{...p,spouseIds:[...p.spouseIds],lineageType:'marriage'}]));
 const overrides=relationDocument?.overrides||{};
 for(const [id,ov] of Object.entries(overrides)){
  if(!state.has(id)||!ov||typeof ov!=='object')continue;
  const p=state.get(id);
  if(own(ov,'fatherId'))p.fatherId=ov.fatherId;
  if(own(ov,'motherId'))p.motherId=ov.motherId;
  if(Array.isArray(ov.spouseIds))p.spouseIds=[...ov.spouseIds];
  if(LINEAGE_TYPES.includes(ov.lineageType))p.lineageType=ov.lineageType;
 }
 return state;
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function reviewRelations(personId,links,doc){
 if(!BASE.has(personId))throw Error('الشخص غير موجود في سجل النسب');
 const l=linkDraft(links), state=currentState(doc), root=state.get(personId);
 const validateId=(id,label,gender)=>{
  if(!id)return;
  const p=state.get(id);
  if(!p){
    const unchanged=(label==='الأب'&&root.fatherId===id)||(label==='الأم'&&root.motherId===id)||(label==='الزوج / الزوجة'&&root.spouseIds.includes(id));
    if(!unchanged)throw Error(label+': الشخص غير مسجل، ولا يمكن ربطه بالاسم وحده');
    return;
  }
  if(id===personId)throw Error('لا يمكن ربط الشخص بنفسه');
  if(gender&&p.gender!==gender)throw Error(label+': نوع الشخص غير مطابق للصلة');
 };
 validateId(l.fatherId,'الأب','ولد');validateId(l.motherId,'الأم','بنت');
 if(l.fatherId&&l.fatherId===l.motherId)throw Error('الأب والأم لا يمكن أن يكونا نفس الشخص');
 for(const id of l.childrenIds)validateId(id,'الابن / البنت');
 for(const id of l.spouseIds){
  validateId(id,'الزوج / الزوجة',root.gender==='ولد'?'بنت':'ولد');
 }
 if(root.gender!=='بنت'&&root.gender!=='ولد')throw Error('جنس الشخص غير موثق');
 const before=new Map([...state].map(([id,p])=>[id,{...p,spouseIds:[...p.spouseIds]}]));
 root.fatherId=l.fatherId;root.motherId=l.motherId;root.lineageType=l.lineageType;
 const parentKey=root.gender==='ولد'?'fatherId':'motherId';
 const previousKids=[...state.values()].filter(p=>p[parentKey]===personId).map(p=>p.id);
 for(const id of previousKids)if(!l.childrenIds.includes(id))state.get(id)[parentKey]='';
 for(const id of l.childrenIds){
  const child=state.get(id);
  if(child.id===l.fatherId||child.id===l.motherId)throw Error('لا يمكن جعل والدي الشخص أبناء له');
  child[parentKey]=personId;
  if(l.childTypes[id])child.lineageType=l.childTypes[id];
 }
 const oldSpouses=new Set([...state.values()].filter(p=>p.spouseIds.includes(personId)).map(p=>p.id).concat(root.spouseIds));
 for(const id of oldSpouses)if(state.has(id)){
  const p=state.get(id);p.spouseIds=p.spouseIds.filter(x=>x!==personId);
 }
 root.spouseIds=[...l.spouseIds];
 for(const id of l.spouseIds)if(!state.get(id).spouseIds.includes(personId))state.get(id).spouseIds.push(personId);
 for(const p of state.values()){
  if(p.fatherId&&p.fatherId===p.motherId)throw Error('تعارض الأب والأم');
  if(p.fatherId&&state.has(p.fatherId)&&state.get(p.fatherId).gender!=='ولد')throw Error('تعارض في جنس الأب');
  if(p.motherId&&state.has(p.motherId)&&state.get(p.motherId).gender!=='بنت')throw Error('تعارض في جنس الأم');
  if(p.fatherId===p.id||p.motherId===p.id)throw Error('صلة ذاتية غير صحيحة');
  const seen=new Set(),path=new Set();
  function visitAncestor(id){
   if(!id||!state.has(id))return;
   if(path.has(id))throw Error('تعديل النسب يسبب حلقة بين الأجيال');
   if(seen.has(id))return;
   path.add(id);
   const ancestor=state.get(id);
   visitAncestor(ancestor.fatherId);visitAncestor(ancestor.motherId);
   path.delete(id);seen.add(id);
  }
  visitAncestor(p.id);
  for(const spouseId of p.spouseIds){
   if(spouseId===p.id)throw Error('ارتباط زوجي غير صالح');
   if(!state.has(spouseId))continue; // Legacy external reference retained without inventing identity.
   if(state.get(spouseId).gender===p.gender)throw Error('تعارض في صلة الزوجية');
   if(p.fatherId===spouseId||p.motherId===spouseId)throw Error('لا يمكن ربط الابن بأحد والديه زوجيًا');
  }
 }
 const changes=[];
 const label=id=>id?(state.get(id)?.name||'شخص غير مسجل'):'غير محدد';
 const format=(k,v)=>k==='spouseIds'?(v||[]).map(label).join('، ')||'لا يوجد':k==='lineageType'?({marriage:'نسب من زواج',biological:'نسب بيولوجي دون استنتاج زواج',care:'تبنٍّ أو رعاية',unknown:'صلة خاصة غير محددة'}[v]):label(v);
 for(const [id,p] of state){
  const old=before.get(id);
  for(const k of ['fatherId','motherId','spouseIds','lineageType']){
   const a=k==='spouseIds'?[...old[k]].sort():old[k],b=k==='spouseIds'?[...p[k]].sort():p[k];
   if(!same(a,b))changes.push({person:p.name,field:{fatherId:'الأب',motherId:'الأم',spouseIds:'الزوج / الزوجة',lineageType:'نوع صلة النسب'}[k],before:format(k,old[k]),after:format(k,p[k])});
  }
 }
 if(changes.length>100)throw Error('تغييرات العلاقات كثيرة؛ قسّمها إلى مراجعات مستقلة');
 const overrides={...(doc?.overrides||{})};
 for(const [id,p] of state){
  const b=BASE.get(id);
  const baseSpouses=[...b.spouseIds].sort(),nowSpouses=[...p.spouseIds].sort();
  if(p.fatherId===b.fatherId&&p.motherId===b.motherId&&same(baseSpouses,nowSpouses)&&p.lineageType==='marriage')delete overrides[id];
  else overrides[id]={fatherId:p.fatherId,motherId:p.motherId,spouseIds:p.spouseIds,lineageType:p.lineageType};
 }
 return {changes,overrides};
}
function reviewSignature(s,id,draft,version){
 return createHmac('sha256',s).update('washaij-links-v1|'+id+'|'+draft.updatedAt+'|'+version+'|'+JSON.stringify(draft.links)).digest('hex');
}


function secret(){
  const s=globalThis.Netlify?.env?.get?.('GHUSN_ADMIN_SECRET')||process.env.GHUSN_ADMIN_SECRET||'';
  return s.length>=18?s:'';
}
function respond(obj,status=200,headers={}){
  return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff',...headers}});
}
function originOK(req){
  const origin=req.headers.get('origin');
  const sameSite=req.headers.get('sec-fetch-site');
  return !!origin && origin===new URL(req.url).origin && (!sameSite||sameSite==='same-origin'||sameSite==='none');
}
function secureEqual(a,b){
  const h1=createHash('sha256').update(String(a)).digest();
  const h2=createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(h1,h2);
}
function signature(secret,payload){
  return createHmac('sha256',secret).update('ghusn-session-v1|'+payload).digest('base64url');
}
function authCookie(s){
  const token=Buffer.from(JSON.stringify({v:1,exp:Date.now()+MAX_AGE*1000,nonce:randomUUID()})).toString('base64url');
  return token+'.'+signature(s,token);
}
function authenticated(req,s){
  if(!s)return false;
  const cookie=req.headers.get('cookie')||'';
  const token=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token)return false;
  const index=token.lastIndexOf('.');if(index<0)return false;
  const payload=token.slice(0,index), sig=token.slice(index+1);
  if(!secureEqual(sig,signature(s,payload)))return false;
  try{
    const obj=JSON.parse(Buffer.from(payload,'base64url').toString());
    return obj.v===1&&Number.isFinite(obj.exp)&&Date.now()<obj.exp;
  }catch{return false}
}
function sessionCookie(val,expire=false){
  return COOKIE+'='+val+'; Path=/; Secure; HttpOnly; SameSite=Strict; '+(expire?'Max-Age=0':'Max-Age='+MAX_AGE);
}
function storeFor(context){
  // Preview stores are DEPLOY-SCOPED; they cannot mutate the live site store.
  if(context?.deploy?.context==='production')
    return getStore({name:'ghusn-editor-documents',consistency:'strong'});
  return getDeployStore('ghusn-editor-preview-documents');
}
function idOf(x){const id=String(x??'');return ID_RE.test(id)?id:null}
function fieldsOf(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('الحقول غير صحيحة');
  const result={};
  for(const key of ALLOWED){
    const val=value[key];
    if(val===undefined)continue;
    if(typeof val!=='string')throw Error('قيمة غير نصية: '+key);
    const clean=val.trim();
    if(clean.length>(key==='notes'?5000:key==='source'?1500:2000))throw Error('تجاوز طول الحقل: '+key);
    result[key]=clean;
  }
  return result;
}
async function readObject(store,key){return await store.get(key,{type:'json',consistency:'strong'})}
async function entryList(store,prefix){
  const {blobs}=await store.list({prefix});
  const result=[];
  for(const item of blobs){
    if(!item.key.startsWith(prefix))continue;
    const obj=await readObject(store,item.key);
    if(obj)result.push(obj);
  }
  return result;
}
function sanitizeRecord(p){
  const id=idOf(p?.personId||p?.id), fields=fieldsOf(p?.fields||p||{});
  if(!id)throw Error('رقم الشخص غير صحيح');
  if(fields.name!==undefined&&!fields.name)throw Error('لا يمكن حفظ اسم فارغ');
  return {personId:id,originalName:String(p.originalName||'').slice(0,250),
    fields,links:linkDraft(p.links),updatedAt:new Date().toISOString(),status:'draft'};
}
async function audit(store,id,record,action){
  // Immutable events: no read-modify-write on a single blob key.
  await store.setJSON('history/'+id+'/'+Date.now()+'-'+randomUUID(),{
    action,personId:id,createdAt:new Date().toISOString(),record
  });
}
export default async function handler(req,context){
  const s=secret(),url=new URL(req.url),action=url.searchParams.get('action')||'session';
  // Public setup probe: returns only a category, never a credential or its length.
  if(action==='setup-status' && req.method==='GET'){
    const raw=String(globalThis.Netlify?.env?.get?.('GHUSN_ADMIN_SECRET')||process.env.GHUSN_ADMIN_SECRET||'');
    return respond({service:'washaij-admin',configured:!!s,setupState:s?'ready':raw?'invalid_length':'not_available'});
  }
  if(!s && !(action==='public' && req.method==='GET'))return respond({configured:false,authenticated:false,error:'يلزم إعداد كلمة مرور الإدارة في إعدادات Netlify.'},503);
  if(req.method!=='GET'&&req.method!=='POST')return respond({error:'طريقة الطلب غير مسموحة'},405);
  if(req.method==='POST'&&!originOK(req))return respond({error:'طلب غير مصرح به من مصدر خارجي'},403);
  if(action==='login'&&req.method==='POST'){
    let body;try{body=await req.json()}catch{return respond({error:'طلب غير صحيح'},400)}
    if(body.username!=='admin'||typeof body.password!=='string'||!secureEqual(body.password,s))
      return respond({error:'اسم المستخدم أو كلمة المرور غير صحيحين'},401);
    return respond({authenticated:true},200,{
      'set-cookie':sessionCookie(authCookie(s))
    });
  }
  if(action==='session'&&req.method==='GET')return respond({configured:true,authenticated:authenticated(req,s)});
  if(action==='public'&&req.method==='GET'){
    let store;try{store=storeFor(context)}catch(_){return respond({error:'تعذر قراءة البيانات المعتمدة'},503)}
    const approved=await entryList(store,'approved/');
    const rel=await readObject(store,'relations/current');
    return respond({schema:'washaij-approved-public-v1',relations:rel?{revision:rel.revision,overrides:rel.overrides}:{revision:'base',overrides:{}},items:approved.map(item=>({
      personId:item.personId,
      fields:Object.fromEntries(PUBLIC.filter(k=>typeof item.fields?.[k]==='string').map(k=>[k,item.fields[k]])),
      approvedAt:item.approvedAt
    }))});
  }

  if(!authenticated(req,s))return respond({error:'يجب دخول المدير أولًا'},401);
  if(action==='logout'&&req.method==='POST')return respond({authenticated:false},200,{'set-cookie':sessionCookie('',true)});
  let store;try{store=storeFor(context)}catch(e){return respond({error:'تعذّر الاتصال بالتخزين'},503)}
  if(action==='person'&&req.method==='GET'){
    const id=idOf(url.searchParams.get('id'));if(!id)return respond({error:'رقم غير صحيح'},400);
    const [draft,approved]=await Promise.all([readObject(store,'draft/'+id),readObject(store,'approved/'+id)]);
    return respond({personId:id,draft,approved});
  }
  if(action==='list'&&req.method==='GET'){
    const [drafts,approved]=await Promise.all([entryList(store,'draft/'),entryList(store,'approved/')]);
    return respond({drafts,approved});
  }
  if(action==='roster'&&req.method==='GET')return respond({people:ROSTER.map(p=>({id:p.id,name:p.name,gender:p.gender})),count:ROSTER.length});
  if(action==='export'&&req.method==='GET'){
    const drafts=await entryList(store,'draft/');
    return respond({schema:'ghusn-admin-export-v1',exportedAt:new Date().toISOString(),drafts});
  }
  if(req.method!=='POST')return respond({error:'طلب غير معروف'},404);
  let body;try{body=await req.json()}catch{return respond({error:'بيانات غير صحيحة'},400)}
  if(action==='save'){
    let rec;try{rec=sanitizeRecord(body)}catch(e){return respond({error:e.message},400)}
    await audit(store,rec.personId,rec,'save');
    await store.setJSON('draft/'+rec.personId,rec);
    return respond({saved:true,personId:rec.personId,draft:rec});
  }
  if(action==='import'){
    if(!Array.isArray(body.records)||body.records.length>500)return respond({error:'عدد السجلات غير صحيح'},400);
    // Validate the entire batch before writing anything, preventing a partial import.
    let records;
    try{records=body.records.map(sanitizeRecord)}catch(e){return respond({error:e.message},400)}
    for(const rec of records){
      await audit(store,rec.personId,rec,'import');
      await store.setJSON('draft/'+rec.personId,rec);
    }
    return respond({imported:records.length,mode:'draft-only'});
  }
  if(action==='review'&&req.method==='POST'){
    const id=idOf(body.personId);if(!id)return respond({error:'شخص غير صحيح'},400);
    const draft=await readObject(store,'draft/'+id);if(!draft)return respond({error:'احفظ المسودة أولًا'},404);
    if(!draft.links)return respond({changes:[],token:null,hasChanges:false});
    const doc=await readObject(store,'relations/current'),version=doc?.revision||'base';
    let checked;try{checked=reviewRelations(id,draft.links,doc)}catch(e){return respond({error:e.message},409)}
    return respond({changes:checked.changes,hasChanges:!!checked.changes.length,token:reviewSignature(s,id,draft,version),version});
  }
  if(action==='approve'){
    const id=idOf(body.personId);if(!id)return respond({error:'رقم الشخص غير صحيح'},400);
    const draft=await readObject(store,'draft/'+id);
    if(!draft)return respond({error:'لا توجد مسودة محفوظة لهذا الشخص'},404);
    // Keep unverified genealogy requests PRIVATE until explicit ID-based kinship verification.
    const publishedFields={};
    for(const key of PUBLIC)if(draft.fields[key]!==undefined)publishedFields[key]=draft.fields[key];
    if(!publishedFields.name)return respond({error:'الاسم الكامل مطلوب قبل الاعتماد'},400);
    let changeResult=null,related=null;
    if(draft.links){
      const relatedMeta=await store.getWithMetadata('relations/current',{type:'json',consistency:'strong'});
      related=relatedMeta?.data||null;
      var relatedEtag=relatedMeta?.etag||null;
      const version=related?.revision||'base';
      if(!body.reviewToken||!secureEqual(body.reviewToken,reviewSignature(s,id,draft,version)))
        return respond({error:'انتهت صلاحية مراجعة العلاقات؛ أعد معاينتها قبل الاعتماد'},409);
      try{changeResult=reviewRelations(id,draft.links,related)}catch(e){return respond({error:e.message},409)}
    }
    const previous=await readObject(store,'approved/'+id);
    const approved={personId:id,originalName:draft.originalName||'',
      fields:publishedFields,approvedAt:new Date().toISOString(),status:'approved'};
    await audit(store,id,{previous,approved},'approve');
    if(changeResult&&changeResult.changes.length){
      const newRelations={revision:randomUUID(),overrides:changeResult.overrides,updatedAt:new Date().toISOString()};
      await audit(store,id,{before:related,after:newRelations,changes:changeResult.changes},'approve-relations');
      const written=await store.setJSON('relations/current',newRelations,
        relatedEtag?{onlyIfMatch:relatedEtag}:{onlyIfNew:true});
      if(written?.modified===false)return respond({error:'تغيّرت العلاقات أثناء المراجعة؛ أعد فحصها قبل النشر'},409);
    }
    await store.setJSON('approved/'+id,approved);
    return respond({approved:true,personId:id,fieldsPublished:PUBLIC,
      relationsApplied:!!changeResult?.changes.length,
      pendingRelations:draft.links?[]:ALLOWED.filter(k=>!PUBLIC.includes(k)&&draft.fields[k]!==undefined),
      note:'تُعرض الأسماء والتواريخ والمصدر والملاحظة بعد تحديث الموقع. روابط الأقارب تحتاج مطابقة بمعرّفاتهم.'});
  }
  return respond({error:'الإجراء غير معروف'},404);
}
export const config={
  rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:100}
};