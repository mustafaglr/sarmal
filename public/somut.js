// Sarmal — Çiz ve Pandomim için el yapımı kelimeler: canlandırılabilen eylemler ve durumlar (Sarmal'ın kendi listesi).
// İnternetteki listelerden hayvan, eşya, yemek, meslek, spor, ulaşım, film gibi somut kategoriler de bu iki moda eklenir.
var SOMUT = [
  'Diş fırçalamak', 'Bisiklet sürmek', 'Balık tutmak', 'İp atlamak', 'Saç kurutmak', 'Ütü yapmak', 'Bulaşık yıkamak', 'Yüzmek',
  'Kayak yapmak', 'Paten kaymak', 'Gitar çalmak', 'Davul çalmak', 'Piyano çalmak', 'Keman çalmak', 'Fotoğraf çekmek', 'Selfie çekmek',
  'Uçurtma uçurmak', 'Kartopu oynamak', 'Kardan adam yapmak', 'Çadır kurmak', 'Mangal yakmak', 'Pizza açmak', 'Hamur yoğurmak', 'Çay demlemek',
  'Kahve içmek', 'Dondurma yemek', 'Spagetti yemek', 'Karpuz kesmek', 'Soğan doğramak', 'Yumurta kırmak', 'Krep çevirmek', 'Mısır patlatmak',
  'Araba sürmek', 'Lastik değiştirmek', 'Park etmek', 'Otobüse yetişmek', 'Uçaktan atlamak', 'Paraşütle inmek', 'Dağa tırmanmak', 'Kürek çekmek',
  'Sörf yapmak', 'Dalış yapmak', 'Ok atmak', 'Bowling oynamak', 'Golf oynamak', 'Tenis oynamak', 'Penaltı atmak', 'Kaleci kurtarışı',
  'Basket atmak', 'Voleybol smaçı', 'Boks yapmak', 'Güreş tutmak', 'Halter kaldırmak', 'Şınav çekmek', 'Mekik çekmek', 'Yoga yapmak',
  'Bale yapmak', 'Halay çekmek', 'Zeybek oynamak', 'Tango yapmak', 'Break dans', 'Robot dansı', 'Ay yürüyüşü', 'Karaoke söylemek',
  'Orkestra yönetmek', 'Sihirbazlık yapmak', 'Tavşan çıkarmak', 'Hokkabazlık', 'İp cambazı', 'Palyaço', 'Mim sanatçısı', 'Heykel gibi durmak',
  'Saklambaç oynamak', 'Körebe', 'Sek sek', 'Satranç oynamak', 'Tavla atmak', 'Okey dizmek', 'Kart karıştırmak', 'Zar atmak',
  'Kitap okumak', 'Gazete okumak', 'Mektup yazmak', 'Tahtaya yazmak', 'Sınava girmek', 'Kopya çekmek', 'Parmak kaldırmak', 'Uyuyakalmak',
  'Horlamak', 'Esnemek', 'Hapşırmak', 'Hıçkırık', 'Ağlamak', 'Kahkaha atmak', 'Kızmak', 'Korkmak',
  'Şaşırmak', 'Utanmak', 'Sarılmak', 'El sallamak', 'Selam vermek', 'Göz kırpmak', 'Öpücük göndermek', 'Alkışlamak',
  'Ayakkabı bağlamak', 'Kravat bağlamak', 'Makyaj yapmak', 'Tıraş olmak', 'Saç taramak', 'Oje sürmek', 'Dar pantolon giymek', 'Şemsiye açmak',
  'Bebek uyutmak', 'Bez değiştirmek', 'Köpek gezdirmek', 'Kedi sevmek', 'İnek sağmak', 'At binmek', 'Deve sürmek', 'Arı kovalamak',
  'Sivrisinek öldürmek', 'Örümcek görmek', 'Fare kovalamak', 'Yılan oynatmak', 'Maymun taklidi', 'Penguen yürüyüşü', 'Tavuk taklidi', 'Fil hortumu',
  'Çiçek sulamak', 'Ağaç dikmek', 'Çim biçmek', 'Odun kesmek', 'Duvar örmek', 'Boya badana', 'Çivi çakmak', 'Ampul değiştirmek',
  'Halı silkelemek', 'Süpürge çekmek', 'Çamaşır asmak', 'Yatak toplamak', 'Perde açmak', 'Kapı çalmak', 'Anahtar kaybetmek', 'Asansörde kalmak',
  'Merdiven çıkmak', 'Trafik polisi', 'Hakem', 'Garson', 'Aşçı', 'Berber', 'Diş hekimi', 'Cerrah',
  'İtfaiyeci', 'Pilot', 'Astronot', 'Dalgıç', 'Korsan', 'Kovboy', 'Ninja', 'Süper kahraman',
  'Robot', 'Zombi', 'Vampir', 'Hayalet', 'Uzaylı', 'Deniz kızı', 'Dev', 'Cüce',
  'Kraliyet düğünü', 'Doğum günü pastası', 'Mum üflemek', 'Hediye açmak', 'Balon şişirmek', 'Havai fişek', 'Gelin damat', 'Kına gecesi',
  'Plajda güneşlenmek', 'Kumdan kale', 'Deniz kabuğu', 'Can simidi', 'Kayıkta sallanmak', 'Gemi batması', 'Fırtına', 'Deprem',
  'Yağmurda kalmak', 'Kar yağışı', 'Gökkuşağı', 'Şimşek', 'Güneş tutulması', 'Volkan', 'Çöl serabı', 'Kutup ayısı',
];
if (typeof module !== 'undefined') module.exports = SOMUT;
