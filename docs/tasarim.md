# Sarmal — telefonda Tabu tarzı parti oyunu (tasarım)

## Amaç
Yan yana oturan arkadaşlar telefondan oynar. İki yol:
- **Çok telefon:** herkes kendi telefonundan ismiyle odaya girer; kurucu oyuncuları takımlara sürükler, modları seçer, başlatır.
- **Tek telefon:** isimler tek telefona girilir, takımlara sürüklenir, telefon elden ele dolaşır.

Sunucu bilgisayarda yerel çalışır (PetekDiyari gibi: `node server.js`, bağımlılık yok). Sayfa sunucusuz açılırsa (dosyadan) yalnızca tek telefon modu çalışır.

## Kararlar (kullanıcının)
- Modlar her oyun başında seçilir; seçilmeyen mod haritada hiç yer almaz.
- Harita içe doğru sarmal; her takımın bir piyonu var; tur bitince piyon net puan kadar ilerler, adım adım animasyonlu.
- Süre: ×1 = 60 sn. 15 Kelime ×2 = 120 sn.
- Modlar:
  - **Anlat (klasik):** 1 kelime + yasaklı kelimeler. Doğru / Pas / Tabu.
  - **Çiz:** kağıda çizilir. Kartta 3 seçenek, "Sonraki kart" butonu. Puan süre sonunda sorulur: kaç doğru, kaç ceza.
  - **15 Kelime:** kartta 3 seçenek; turda toplam 15 kelime hakkı; pas sınırsız ama her pas 1 kelime yer. Doğru / Pas / Tabu + "+1 kelime" sayacı.
  - **Pandomim:** kartta 3 seçenek, konuşmak yasak. Doğru / Pas / Tabu.
- Ses: tur boyunca sessiz; son 5 saniyede tik-tak; süre bitince "dııııt".
- Kelimeler internetten çekilir (4 açık GitHub listesi, ~2.770 benzersiz kart).
- "Nasıl oynanır?" sayfası.

## Benim kararlarım (düzeltilebilir)
- Puan: Doğru +1, Tabu −1, Pas 0. Anlat ve Pandomim'de turda 3 pas hakkı.
- Takımın piyonu hangi karedeyse o tur o modu oynar. 40 kare + merkez bitiş. Eksi puanda geri gider (başlangıcın gerisine düşmez). Merkeze ilk varan kazanır.
- En az 2 takım, her takımda en az 2 oyuncu. En çok 6 takım.
- Anlatan kişi takım içinde sırayla değişir.
- Çok telefonda kim ne görür: anlatan kartı ve tüm butonları; rakipler kartı, Tabu'yu ve kelime sayacını; anlatanın takım arkadaşları yalnızca süreyi. Kurucu her an anlatanın yerine basabilir (telefonu kapanırsa oyun takılmasın).
- Sesler her telefonda çalar; sessize alma düğmesi var.
- Tek telefonda oyun tarayıcıya kaydedilir; sayfa yenilenirse kaldığı yerden devam eder.
- Kelime yükleme: sunucu açılışta 4 listeyi çeker, birleştirir, `kelimeler.json` olarak saklar (sonra internetsiz de çalışır). Sunucusuz açılışta tarayıcı listeleri kendisi çeker. Hiçbiri olmazsa içine gömülü 500 kartlık MIT lisanslı liste.
- İsim: oyunun ve markanın adını kopyalamamak için "Sarmal".

## Yaklaşımlar
1. **Yerel Node sunucusu + SSE (seçilen).** PetekDiyari ile aynı; bağımlılık yok, aynı Wi-Fi'de çalışır, ngrok ile dışarı açılabilir.
2. Statik site + WebRTC (PeerJS): sunucu gerektirmez ama dış aracı sunucuya ve ağ koşullarına bağlı. Kullanıcı yerel sunucu istedi.
3. Firebase vb. bulut: hesap ve kurulum gerektirir; gereksiz.

## Yapı
- `public/game.js` — kurallar (saf; hem sunucu hem tarayıcı kullanır): `newGame`, `act`, `view`.
- `public/words.js` — kaynak listeleri ve birleştirme (sunucu + tarayıcı).
- `public/yedek.js` — gömülü 500 kart.
- `public/client.js`, `sound.js`, `style.css`, `index.html` — arayüz.
- `server.js` — odalar, SSE, süre sayacı, kelime yükleme.
- `test.js` — kurallar için `node --test`.

## Dışarıda bırakılanlar
Çizimin telefona çizilmesi/aktarılması, kukla modu, duraklatma, QR kod, süre ayarı.
