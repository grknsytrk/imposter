export const PROJECT_NAME = "Imposter";

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
    hints: Record<string, string>; // playerId -> hint
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
    words: string[];
};

export const CATEGORIES: Category[] = [
    {
        name: 'Animals',
        words: ['Lion', 'Elephant', 'Eagle', 'Dog', 'Cat', 'Rabbit', 'Horse', 'Cow', 'Sheep', 'Fish', 'Parrot', 'Penguin', 'Crocodile', 'Giraffe', 'Monkey']
    },
    {
        name: 'Food',
        words: ['Pizza', 'Burger', 'Kebab', 'Sushi', 'Cake', 'Ice Cream', 'Chocolate', 'Apple', 'Banana', 'Orange', 'Rice', 'Pasta', 'Soup', 'Salad', 'Sandwich']
    },
    {
        name: 'Countries',
        words: ['Turkey', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'China', 'Brazil', 'Mexico', 'Canada', 'Australia', 'Egypt', 'India', 'Russia', 'UK']
    },
    {
        name: 'Jobs',
        words: ['Doctor', 'Teacher', 'Engineer', 'Chef', 'Pilot', 'Police', 'Firefighter', 'Lawyer', 'Nurse', 'Artist', 'Musician', 'Athlete', 'Driver', 'Waiter', 'Butcher']
    },
    {
        name: 'Sports',
        words: ['Football', 'Basketball', 'Volleyball', 'Tennis', 'Swimming', 'Running', 'Cycling', 'Boxing', 'Wrestling', 'Skiing', 'Golf', 'Baseball', 'Hockey', 'Badminton', 'Table Tennis']
    },
    {
        name: 'Movies',
        words: ['Titanic', 'Avatar', 'Matrix', 'Star Wars', 'Harry Potter', 'Lord of the Rings', 'Inception', 'Gladiator', 'Forrest Gump', 'Joker', 'Batman', 'Spiderman', 'Frozen', 'Shrek', 'Toy Story']
    },
    {
        name: 'Clash Royale',
        words: [
            'Knight', 'Archers', 'Goblins', 'Giant', 'P.E.K.K.A', 'Minions', 'Balloon', 'Witch', 'Barbarians', 'Golem', 'Skeletons', 'Valkyrie', 'Skeleton Army', 'Bomber', 'Musketeer', 'Baby Dragon', 'Prince', 'Wizard', 'Mini P.E.K.K.A', 'Spear Goblins', 'Giant Skeleton', 'Hog Rider', 'Minion Horde', 'Ice Wizard', 'Royal Giant', 'Guards', 'Princess', 'Dark Prince', 'Three Musketeers', 'Lava Hound', 'Ice Spirit', 'Fire Spirit', 'Miner', 'Sparky', 'Bowler', 'Lumberjack', 'Battle Ram', 'Inferno Dragon', 'Ice Golem', 'Mega Minion', 'Dart Goblin', 'Goblin Gang', 'Electro Wizard', 'Elite Barbarians', 'Hunter', 'Executioner', 'Bandit', 'Royal Recruits', 'Night Witch', 'Bats', 'Royal Ghost', 'Ram Rider', 'Zappies', 'Rascals', 'Cannon Cart', 'Mega Knight', 'Skeleton Barrel', 'Flying Machine', 'Wall Breakers', 'Royal Hogs', 'Goblin Giant', 'Fisherman', 'Magic Archer', 'Electro Dragon', 'Firecracker', 'Mighty Miner', 'Elixir Golem', 'Goblin Barrel', 'Freeze', 'Mirror', 'Lightning', 'Zap', 'Poison', 'Graveyard', 'The Log', 'Tornado', 'Clone', 'Earthquake', 'Barbarian Barrel', 'Heal Spirit', 'Giant Snowball', 'Royal Delivery', 'Vines', 'Goblin Curse', 'Spirit Empress'
        ]
    },
    {
        name: 'Anime',
        words: [
            'Naruto', 'One Piece', 'Dragon Ball', 'Attack on Titan', 'Death Note', 'Bleach', 'Fullmetal Alchemist', 'Demon Slayer', 'Jujutsu Kaisen', 'One Punch Man', 'Pokemon', 'Sword Art Online', 'Tokyo Ghoul', 'Hunter x Hunter', 'My Hero Academia',
            'Steins;Gate', 'Code Geass', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'JoJo\'s Bizarre Adventure', 'Gintama', 'Mob Psycho 100', 'Haikyuu!!', 'Kuroko no Basket', 'Fairy Tail', 'Black Clover', 'Dr. Stone', 'Fire Force', 'Soul Eater', 'Blue Exorcist',
            'Psycho-Pass', 'Parasyte', 'Seven Deadly Sins', 'Overlord', 'Konosuba', 'Re:Zero', 'Violet Evergarden', 'Vinland Saga', 'Chainsaw Man', 'Spy x Family', 'Blue Lock', 'Oshi no Ko', 'Frieren', 'Mashle', 'Hell\'s Paradise', 'Bungou Stray Dogs',
            'Classroom of the Elite', 'Darling in the FranXX', 'Akame ga Kill!', 'No Game No Life', 'Mirai Nikki', 'Elfen Lied', 'Another', 'Hellsing', 'Berserk', 'The Disastrous Life of Saiki K.', 'Kaguya-sama: Love is War', 'Erased', 'Your Lie in April',
            'Toradora!', 'Angel Beats!', 'Clannad', 'Anohana', 'A Silent Voice', 'Your Name', 'Spirited Away', 'Princess Mononoke', 'Howl\'s Moving Castle', 'Cyberpunk: Edgerunners', 'Arcane', 'Castlevania', 'Sailor Moon', 'Digimon', 'Yu-Gi-Oh!', 'Beyblade',
            'Assassination Classroom', 'Noragami', 'Seraph of the End', 'Charlotte', 'Plastic Memories', 'Made in Abyss', 'The Promised Neverland', 'Great Teacher Onizuka', 'Hajime no Ippo', 'Slam Dunk', 'Initial D', 'Monster', 'Mushishi', 'Natsume Yuujinchou'
        ]
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
