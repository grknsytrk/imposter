export const PROJECT_NAME = "Imposter";

// Re-export command types
export * from './commands';

// Re-export phase contract
export * from './phase';

// ==================== PLAYER ====================
export type PlayerRole = 'CITIZEN' | 'IMPOSTER' | null;

export type Player = {
    id: string;
    name: string;
    avatar: string;
    isReady: boolean;
    role?: PlayerRole;
    isEliminated?: boolean;
    hint?: string; // İpucu turunda verilen ipucu
    hasVoted?: boolean;
    userId?: string; // Supabase user ID for single session enforcement
};

// ==================== GAME PHASE ====================
export type GamePhase =
    | 'LOBBY'           // Oyun başlamadan önce bekleme
    | 'ROLE_REVEAL'     // Roller gösteriliyor (3 saniye)
    | 'HINT_ROUND'      // Sırayla ipucu verme
    | 'DISCUSSION'      // Tartışma süresi
    | 'VOTING'          // Oylama
    | 'VOTE_RESULT'     // Oylama sonucu gösterimi
    | 'GAME_OVER';      // Oyun bitti, kazanan gösterimi

export type GameStatus = 'LOBBY' | 'PLAYING' | 'ENDED';

// ==================== GAME MODE ====================
export type GameMode = 'CLASSIC' | 'BLIND';

// ==================== GAME STATE ====================
export type GameState = {
    phase: GamePhase;
    category: string;
    word: string;
    imposterId: string;
    currentTurnIndex: number;      // Şu an sırası olan oyuncu indexi
    turnOrder: string[];           // Oyuncu ID'leri sırası
    turnTimeLeft: number;          // Kalan süre (saniye)
    phaseTimeLeft: number;         // Faz için kalan süre
    roundNumber: number;           // Kaçıncı round
    votes: Record<string, string>; // voterId -> votedPlayerId
    eliminatedPlayerId?: string;   // Elenen oyuncu
    winner?: 'CITIZENS' | 'IMPOSTER';
    hints: Record<string, string[]>; // playerId -> hints array (per round)
    gameMode: GameMode;            // CLASSIC veya BLIND
    imposterWord?: string;         // Sadece BLIND modda kullanılır
};

// ==================== ROOM ====================
export type Room = {
    id: string;
    name: string;
    password?: string;
    players: Player[];
    maxPlayers: number;
    ownerId: string;
    status: GameStatus;
    gameState?: GameState;
    selectedCategory?: string; // Host'un seçtiği kategori (boşsa rastgele)
    gameMode?: GameMode;       // Default: 'CLASSIC'
};

// ==================== CHAT ====================
export type ChatMessage = {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: number;
    isSystem?: boolean;
};

// ==================== CATEGORIES & WORDS ====================
export type Category = {
    name: string;
    words: string[] | { en: string[]; tr: string[] };
};

export const CATEGORIES: Category[] = [
    {
        name: 'Animals',
        words: {
            en: ['Lion', 'Elephant', 'Eagle', 'Dog', 'Cat', 'Rabbit', 'Horse', 'Cow', 'Sheep', 'Fish', 'Parrot', 'Penguin', 'Crocodile', 'Giraffe', 'Monkey', 'Tiger', 'Wolf', 'Fox', 'Bear', 'Panda', 'Koala', 'Kangaroo', 'Zebra', 'Hippo', 'Rhino', 'Cheetah', 'Leopard', 'Whale', 'Dolphin', 'Shark', 'Octopus', 'Spider', 'Snake', 'Turtle', 'Frog', 'Butterfly', 'Bee', 'Ant', 'Bat', 'Owl', 'Swan', 'Peacock', 'Flamingo', 'Hamster', 'Squirrel'],
            tr: ['Aslan', 'Fil', 'Kartal', 'Köpek', 'Kedi', 'Tavşan', 'At', 'İnek', 'Koyun', 'Balık', 'Papağan', 'Penguen', 'Timsah', 'Zürafa', 'Maymun', 'Kaplan', 'Kurt', 'Tilki', 'Ayı', 'Panda', 'Koala', 'Kanguru', 'Zebra', 'Su Aygırı', 'Gergedan', 'Çita', 'Leopar', 'Balina', 'Yunus', 'Köpekbalığı', 'Ahtapot', 'Örümcek', 'Yılan', 'Kaplumbağa', 'Kurbağa', 'Kelebek', 'Arı', 'Karınca', 'Yarasa', 'Baykuş', 'Kuğu', 'Tavus Kuşu', 'Flamingo', 'Hamster', 'Sincap']
        }
    },
    {
        name: 'Food',
        words: {
            en: ['Pizza', 'Burger', 'Kebab', 'Sushi', 'Cake', 'Ice Cream', 'Chocolate', 'Apple', 'Banana', 'Orange', 'Rice', 'Pasta', 'Soup', 'Salad', 'Sandwich', 'Steak', 'Taco', 'Burrito', 'Waffle', 'Pancake', 'Donut', 'Cookie', 'Muffin', 'Croissant', 'Bread', 'Cheese', 'Egg', 'Milk', 'Yogurt', 'Honey', 'Watermelon', 'Strawberry', 'Grape', 'Pineapple', 'Mango', 'Peach', 'Kiwi', 'Carrot', 'Potato', 'Tomato', 'Cucumber', 'Onion', 'Garlic', 'Pepper', 'Corn'],
            tr: ['Pizza', 'Hamburger', 'Kebap', 'Suşi', 'Pasta', 'Dondurma', 'Çikolata', 'Elma', 'Muz', 'Portakal', 'Pilav', 'Makarna', 'Çorba', 'Salata', 'Sandviç', 'Biftek', 'Tako', 'Burrito', 'Waffle', 'Krep', 'Donut', 'Kurabiye', 'Kek', 'Kruvasan', 'Ekmek', 'Peynir', 'Yumurta', 'Süt', 'Yoğurt', 'Bal', 'Karpuz', 'Çilek', 'Üzüm', 'Ananas', 'Mango', 'Şeftali', 'Kivi', 'Havuç', 'Patates', 'Domates', 'Salatalık', 'Soğan', 'Sarımsak', 'Biber', 'Mısır']
        }
    },
    {
        name: 'Countries',
        words: {
            en: ['Turkey', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'China', 'Brazil', 'Mexico', 'Canada', 'Australia', 'Egypt', 'India', 'Russia', 'UK', 'USA', 'Argentina', 'Portugal', 'Netherlands', 'Sweden', 'Norway', 'Finland', 'Denmark', 'Switzerland', 'Austria', 'Greece', 'South Korea', 'Thailand', 'Vietnam', 'Singapore', 'Poland', 'Belgium', 'Ukraine', 'Iran', 'Saudi Arabia', 'UAE', 'South Africa', 'Nigeria', 'Kenya', 'Morocco', 'Chile', 'Colombia', 'Peru', 'New Zealand', 'Indonesia'],
            tr: ['Türkiye', 'Almanya', 'Fransa', 'İtalya', 'İspanya', 'Japonya', 'Çin', 'Brezilya', 'Meksika', 'Kanada', 'Avustralya', 'Mısır', 'Hindistan', 'Rusya', 'İngiltere', 'Amerika', 'Arjantin', 'Portekiz', 'Hollanda', 'İsveç', 'Norveç', 'Finlandiya', 'Danimarka', 'İsviçre', 'Avusturya', 'Yunanistan', 'Güney Kore', 'Tayland', 'Vietnam', 'Singapur', 'Polonya', 'Belçika', 'Ukrayna', 'İran', 'Suudi Arabistan', 'BAE', 'Güney Afrika', 'Nijerya', 'Kenya', 'Fas', 'Şili', 'Kolombiya', 'Peru', 'Yeni Zelanda', 'Endonezya']
        }
    },
    {
        name: 'Cities',
        words: {
            en: ['Istanbul', 'Ankara', 'Izmir', 'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'New York', 'Tokyo', 'Seoul', 'Beijing', 'Moscow', 'Dubai', 'Sydney', 'Amsterdam', 'Barcelona', 'Vienna', 'Prague', 'Venice', 'Rio de Janeiro', 'Buenos Aires', 'Cairo', 'Cape Town', 'Toronto', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas', 'Kyoto', 'Osaka', 'Shanghai', 'Hong Kong', 'Singapore', 'Bangkok', 'Mumbai', 'Jerusalem', 'Athens', 'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki', 'Dublin', 'Warsaw'],
            tr: ['İstanbul', 'Ankara', 'İzmir', 'Londra', 'Paris', 'Berlin', 'Roma', 'Madrid', 'New York', 'Tokyo', 'Seul', 'Pekin', 'Moskova', 'Dubai', 'Sidney', 'Amsterdam', 'Barselona', 'Viyana', 'Prag', 'Venedik', 'Rio de Janeiro', 'Buenos Aires', 'Kahire', 'Cape Town', 'Toronto', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas', 'Kyoto', 'Osaka', 'Şangay', 'Hong Kong', 'Singapur', 'Bangkok', 'Mumbai', 'Kudüs', 'Atina', 'Stockholm', 'Oslo', 'Kopenhag', 'Helsinki', 'Dublin', 'Varşova']
        }
    },
    {
        name: 'Jobs',
        words: {
            en: ['Doctor', 'Teacher', 'Engineer', 'Chef', 'Pilot', 'Police', 'Firefighter', 'Lawyer', 'Nurse', 'Artist', 'Musician', 'Athlete', 'Driver', 'Waiter', 'Butcher', 'Architect', 'Scientist', 'Dentist', 'Pharmacist', 'Vet', 'Farmer', 'Carpenter', 'Electrician', 'Plumber', 'Baker', 'Barber', 'Actor', 'Dancer', 'Journalist', 'Writer', 'Programmer', 'Designer', 'Manager', 'Accountant', 'Cashier', 'Soldier', 'Sailor', 'Astronaut', 'Mechanic', 'Cleaner', 'Lifeguard', 'Photographer', 'Coach', 'Judge', 'Librarian'],
            tr: ['Doktor', 'Öğretmen', 'Mühendis', 'Aşçı', 'Pilot', 'Polis', 'İtfaiyeci', 'Avukat', 'Hemşire', 'Sanatçı', 'Müzisyen', 'Sporcu', 'Şoför', 'Garson', 'Kasap', 'Mimar', 'Bilim İnsanı', 'Diş Hekimi', 'Eczacı', 'Veteriner', 'Çiftçi', 'Marangoz', 'Elektrikçi', 'Tesisatçı', 'Fırıncı', 'Berber', 'Aktör', 'Dansçı', 'Gazeteci', 'Yazar', 'Programcı', 'Tasarımcı', 'Müdür', 'Muhasebeci', 'Kasiyer', 'Asker', 'Denizci', 'Astronot', 'Tamirci', 'Temizlikçi', 'Cankurtaran', 'Fotoğrafçı', 'Antrenör', 'Hakim', 'Kütüphaneci']
        }
    },
    {
        name: 'Sports',
        words: {
            en: ['Football', 'Basketball', 'Volleyball', 'Tennis', 'Swimming', 'Running', 'Cycling', 'Boxing', 'Wrestling', 'Skiing', 'Golf', 'Baseball', 'Hockey', 'Badminton', 'Table Tennis', 'Rugby', 'Cricket', 'Surfing', 'Skateboarding', 'Karate', 'Judo', 'Taekwondo', 'Fencing', 'Archery', 'Rowing', 'Sailing', 'Climbing', 'Diving', 'Bowling', 'Darts', 'Yoga', 'Pilates', 'Gymnastics', 'Figure Skating', 'Chess', 'Poker', 'Formula 1', 'MotoGP', 'Horse Racing', 'Billiards', 'Lacrosse', 'Handball', 'Water Polo', 'Triathlon', 'Marathon'],
            tr: ['Futbol', 'Basketbol', 'Voleybol', 'Tenis', 'Yüzme', 'Koşu', 'Bisiklet', 'Boks', 'Güreş', 'Kayak', 'Golf', 'Beyzbol', 'Hokey', 'Badminton', 'Masa Tenisi', 'Ragbi', 'Kriket', 'Sörf', 'Kaykay', 'Karate', 'Judo', 'Tekvando', 'Eskrim', 'Okçuluk', 'Kürek', 'Yelken', 'Tırmanış', 'Dalış', 'Bovling', 'Dart', 'Yoga', 'Pilates', 'Jimnastik', 'Artistik Buz Pateni', 'Satranç', 'Poker', 'Formula 1', 'MotoGP', 'At Yarışı', 'Bilardo', 'Lakros', 'Hentbol', 'Sutopu', 'Triatlon', 'Maraton']
        }
    },
    {
        name: 'Movies',
        words: ['Titanic', 'Avatar', 'Matrix', 'Star Wars', 'Harry Potter', 'Lord of the Rings', 'Inception', 'Gladiator', 'Forrest Gump', 'Joker', 'Batman', 'Spiderman', 'Frozen', 'Shrek', 'Toy Story', 'Interstellar', 'The Godfather', 'Pulp Fiction', 'The Dark Knight', 'Fight Club', 'Se7en', 'Sherlock Holmes', 'Iron Man', 'Avengers', 'Thor', 'Black Panther', 'Wonder Woman', 'Deadpool', 'Pirates of the Caribbean', 'Jurassic Park', 'King Kong', 'Godzilla', 'The Lion King', 'Aladdin', 'Finding Nemo', 'Up', 'Ratatouille', 'Cars', 'Monsters Inc', 'Inside Out', 'Coco', 'Soul', 'Minions', 'Despicable Me', 'Ice Age']
    },
    {
        name: 'Super Heroes',
        words: ['Superman', 'Batman', 'Spider-Man', 'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Wonder Woman', 'Aquaman', 'Flash', 'Green Lantern', 'Wolverine', 'Deadpool', 'Black Panther', 'Doctor Strange', 'Ant-Man', 'Black Widow', 'Hawkeye', 'Vision', 'Scarlet Witch', 'Falcon', 'War Machine', 'Star-Lord', 'Gamora', 'Groot', 'Rocket', 'Drax', 'Thanos', 'Loki', 'Venom', 'Catwoman', 'Joker', 'Harley Quinn', 'Bane', 'Penguin', 'Two-Face', 'Riddler', 'Poison Ivy', 'Scarecrow', 'Magneto', 'Professor X', 'Cyclops', 'Storm', 'Rogue', 'Nightcrawler']
    },
    {
        name: 'Instruments',
        words: {
            en: ['Guitar', 'Piano', 'Violin', 'Drums', 'Flute', 'Trumpet', 'Saxophone', 'Cello', 'Harp', 'Accordion', 'Harmonica', 'Clarinet', 'Oboe', 'Trombone', 'Tuba', 'Banjo', 'Mandolin', 'Ukulele', 'Sitar', 'Bagpipes', 'Didgeridoo', 'Xylophone', 'Cymbals', 'Tambourine', 'Triangle', 'Synthesizer', 'Electric Guitar', 'Bass Guitar', 'Recorder', 'Viola', 'Double Bass', 'Bassoon', 'Cornet', 'French Horn', 'Lute', 'Lyre', 'Organ', 'Steel Drum', 'Djembe', 'Bongo', 'Conga', 'Marimba', 'Vibraphone', 'Glockenspiel'],
            tr: ['Gitar', 'Piyano', 'Keman', 'Davul', 'Flüt', 'Trompet', 'Saksafon', 'Viyolonsel', 'Arp', 'Akordeon', 'Mızıka', 'Klarnet', 'Obua', 'Trombon', 'Tuba', 'Banjo', 'Mandolin', 'Ukulele', 'Sitar', 'Gayda', 'Didjeridu', 'Ksilofon', 'Zil', 'Tef', 'Üçgen', 'Synthesizer', 'Elektro Gitar', 'Bas Gitar', 'Blok Flüt', 'Viyola', 'Kontrbas', 'Fagot', 'Kornet', 'Korno', 'Ud', 'Lir', 'Org', 'Çelik Davul', 'Djembe', 'Bongo', 'Konga', 'Marimba', 'Vibrafon', 'Çan']
        }
    },
    {
        name: 'Clash Royale',
        words: {
            en: ['Knight', 'Archers', 'Goblins', 'Giant', 'P.E.K.K.A', 'Minions', 'Balloon', 'Witch', 'Barbarians', 'Golem', 'Skeletons', 'Valkyrie', 'Skeleton Army', 'Bomber', 'Musketeer', 'Baby Dragon', 'Prince', 'Wizard', 'Mini P.E.K.K.A', 'Spear Goblins', 'Giant Skeleton', 'Hog Rider', 'Minion Horde', 'Ice Wizard', 'Royal Giant', 'Guards', 'Princess', 'Dark Prince', 'Three Musketeers', 'Lava Hound', 'Ice Spirit', 'Fire Spirit', 'Miner', 'Sparky', 'Bowler', 'Lumberjack', 'Battle Ram', 'Inferno Dragon', 'Ice Golem', 'Mega Minion', 'Dart Goblin', 'Goblin Gang', 'Electro Wizard', 'Elite Barbarians', 'Hunter'],
            tr: ['Şövalye', 'Okçular', 'Goblinler', 'Dev', 'P.E.K.K.A', 'Minyonlar', 'Balon', 'Cadı', 'Barbarlar', 'Golem', 'İskeletler', 'Valkür', 'İskelet Ordusu', 'Bombacı', 'Silahşör', 'Bebek Ejderha', 'Prens', 'Büyücü', 'Mini P.E.K.K.A', 'Mızraklı Goblinler', 'Dev İskelet', 'Domuz Binicisi', 'Minyon Sürüsü', 'Buz Büyücüsü', 'Kraliyet Devi', 'Muhafızlar', 'Prenses', 'Kara Prens', 'Üç Silahşör', 'Lav Tazısı', 'Buz Ruhu', 'Ateş Ruhu', 'Madenci', 'Kıvılcım', 'Atıcı', 'Oduncu', 'Koç Başı', 'Cehennem Ejderhası', 'Buz Golemi', 'Mega Minyon', 'Dart Goblini', 'Goblin Çetesi', 'Elektro Büyücü', 'Elit Barbarlar', 'Avcı']
        }
    },
    {
        name: 'Anime',
        words: ["Frieren: Beyond Journey's End", 'Chainsaw Man', 'Fullmetal Alchemist', 'Steins;Gate', 'Attack on Titan', 'Gintama', 'Hunter x Hunter', 'Bleach', 'Kaguya-sama', 'Fruits Basket', 'Clannad', 'A Silent Voice', 'The Apothecary Diaries', 'Code Geass', 'March Comes in Like a Lion', 'Monster', 'Naruto', 'One Piece', 'Dragon Ball', 'Death Note', 'Demon Slayer', 'Jujutsu Kaisen', 'One Punch Man', 'Pokemon', 'Sword Art Online', 'Tokyo Ghoul', 'My Hero Academia', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'JoJo', 'Mob Psycho 100', 'Haikyuu', "Kuroko's Basketball", 'Black Clover', 'Dr. Stone', 'Fire Force', 'Parasyte', 'Seven Deadly Sins', 'Overlord', 'Konosuba', 'Re:Zero', 'Violet Evergarden', 'Vinland Saga', 'Spy x Family', 'Blue Lock', 'Oshi no Ko', 'Solo Leveling', 'Dandadan', 'Welcome to the NHK', 'Bunny Girl Senpai', 'Your Name', 'Grand Blue Dreaming', 'Your Lie in April', 'Food Wars', 'Mushoku Tensei']
    }
];

// ==================== GAME CONFIG ====================
export const GAME_CONFIG = {
    ROLE_REVEAL_TIME: 5,        // Rol gösterme süresi (saniye)
    HINT_TURN_TIME: 20,         // Her oyuncunun ipucu süresi (saniye)
    HINT_ROUNDS: 2,             // Kaç tur ipucu verilecek
    DISCUSSION_TIME: 30,        // Tartışma süresi (saniye)
    VOTING_TIME: 30,            // Oylama süresi (saniye)
    VOTE_RESULT_TIME: 5,        // Sonuç gösterme süresi (saniye)
    MIN_PLAYERS: 3,
    MAX_PLAYERS: 8
};
