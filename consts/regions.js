/**
 * Region-segmented name pools with style lean — GDD §3.3/§6.3. Region biases
 * the style roll (a weighted lean, never a hard rule) so scouted rosters read
 * as a real fight-world map. Pools are placeholder-scale for Phase 1; grow
 * them freely — the generator only ever samples, it never enumerates.
 */
const REGIONS = {
    usa: {
        label: "United States",
        weight: 22,
        styleLean: { wrestling: 3, boxing: 2 },
        firstNames: ["Marcus", "Tyler", "DeShawn", "Jake", "Aaron", "Chris", "Devon", "Logan", "Malik", "Brandon", "Cole", "Xavier"],
        lastNames: ["Johnson", "Miller", "Carter", "Brooks", "Vega", "Thompson", "Hayes", "Walker", "Reed", "Cruz", "Bennett", "Ford"],
    },
    brazil: {
        label: "Brazil",
        weight: 16,
        styleLean: { bjj: 4, "muay-thai": 1 },
        firstNames: ["Carlos", "Rafael", "Thiago", "Gabriel", "Lucas", "André", "Renato", "Vitor", "Paulo", "Diego", "Felipe", "Bruno"],
        lastNames: ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida", "Nogueira", "Barbosa", "Machado", "Teixeira", "Moraes"],
    },
    mexico: {
        label: "Mexico",
        weight: 10,
        styleLean: { boxing: 4 },
        firstNames: ["Miguel", "Alejandro", "Javier", "Luis", "Diego", "Emiliano", "Santiago", "Raúl", "Fernando", "Óscar", "Hugo", "Adrián"],
        lastNames: ["Hernández", "García", "Martínez", "López", "Ramírez", "Torres", "Flores", "Vargas", "Mendoza", "Rojas", "Delgado", "Fuentes"],
    },
    thailand: {
        label: "Thailand",
        weight: 8,
        styleLean: { "muay-thai": 5 },
        firstNames: ["Somchai", "Anan", "Kiet", "Chai", "Narong", "Prasit", "Somsak", "Thanet", "Wichai", "Kraisee", "Decha", "Sakda"],
        lastNames: ["Sitthichai", "Yodsanklai", "Saenchai", "Buakaw", "Petchboonchu", "Singdam", "Namsaknoi", "Kaewsamrit", "Chuwattana", "Sor Thanikul", "Petchyindee", "Fairtex"],
    },
    japan: {
        label: "Japan",
        weight: 8,
        styleLean: { judo: 4, bjj: 1 },
        firstNames: ["Kazushi", "Takanori", "Hiroki", "Yuta", "Shinya", "Kenji", "Daiki", "Ryo", "Satoshi", "Naoki", "Tatsuya", "Kota"],
        lastNames: ["Sakuraba", "Gomi", "Aoki", "Yamamoto", "Kikuchi", "Nakamura", "Tanaka", "Sato", "Watanabe", "Kondo", "Ishii", "Horiguchi"],
    },
    russia: {
        label: "Russia & Caucasus",
        weight: 14,
        styleLean: { sambo: 3, wrestling: 2 },
        firstNames: ["Khabib", "Magomed", "Islam", "Zubaira", "Rustam", "Aleksei", "Dmitri", "Sergei", "Umar", "Artem", "Nikolai", "Ramzan"],
        lastNames: ["Nurmagomedov", "Makhachev", "Volkov", "Tukhugov", "Khabilov", "Petrov", "Ivanov", "Emeliananko", "Gadzhiev", "Tsarukyan", "Sokolov", "Abdulaev"],
    },
    uk: {
        label: "United Kingdom & Ireland",
        weight: 10,
        styleLean: { boxing: 3, "muay-thai": 1 },
        firstNames: ["Liam", "Connor", "Callum", "Jack", "Owen", "Darren", "Paddy", "Ciarán", "Lewis", "Nathan", "Tommy", "Sean"],
        lastNames: ["Murphy", "O'Connor", "Gallagher", "Smith", "Till", "Edwards", "Pimblett", "Aspinall", "McCann", "Doyle", "Kavanagh", "Bisping"],
    },
    france: {
        label: "France & West Africa",
        weight: 12,
        styleLean: { "muay-thai": 2, wrestling: 1, boxing: 1 },
        firstNames: ["Cyril", "Francis", "Cheick", "Ousmane", "Ibrahim", "Karim", "Mamadou", "Jean", "Abdoulaye", "Sékou", "Moussa", "Idris"],
        lastNames: ["Gane", "Ngannou", "Kongo", "Diallo", "Traoré", "Doumbé", "Keita", "Coulibaly", "Sissoko", "Camara", "Bamba", "Fofana"],
    },
};

module.exports = { REGIONS };
