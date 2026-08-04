import type { Dict } from '../i18n';

export const el: Dict = {
  // --- menu ---
  'menu.title': 'COLD BORE',
  'menu.subtitle': 'Π Ρ Ο Π Ο Ν Η Τ Η Σ   Α Κ Ρ Ι Β Ε Ι Α Σ',
  'menu.stages_cleared': '{cleared} από {total} στάδια   ·   {credits} cr',
  'menu.course': 'ΣΕΙΡΑ ΒΟΛΗΣ',
  'menu.course_sub': '{count} στάδια · εκπαίδευση έως ένα μίλι',
  'menu.free_field': 'ΕΛΕΥΘΕΡΟ ΠΕΔΙΟ',
  'menu.free_field_sub': 'οι πλάκες σου · καιρός · οποιοδήποτε κιτ · ρολόι μετρά πάνω',
  'menu.armoury': 'ΟΠΛΟΣΤΑΣΙΟ',
  'menu.career': 'ΚΑΡΙΕΡΑ',
  'menu.career_sub': 'στατιστικά · ρεκόρ · ιστορικό · επιτεύγματα',
  'menu.glossary': 'ΓΛΩΣΣΑΡΙ',
  'menu.glossary_sub': 'mil, DOPE, παρεκκλίσεις, βαθμοί — με απλά λόγια',
  'menu.settings': 'ΡΥΘΜΙΣΕΙΣ',
  'menu.settings_imperial': 'γιάρδες, ίντσες, Φαρενάιτ',
  'menu.settings_metric': 'μέτρα, εκατοστά, Κελσίου',
  'menu.how_it_works': 'ΠΩΣ ΔΟΥΛΕΥΕΙ',
  'menu.footer':
    'Σύρε για σκόπευση, κράτα την αναπνοή, πάτα τη σκανδάλη. Όλα τα υπόλοιπα είναι αριθμητική.',

  // --- free field ---
  'free_field.title': 'ΕΛΕΥΘΕΡΟ ΠΕΔΙΟ',
  'free_field.blurb':
    'Φτιάξε τη δική σου σειρά. Αριθμός και τύπος πλακών, απόσταση για καθεμία, κρυφές αποστάσεις αν θες να μετρήσεις με mil, καιρός και τοπίο (ή τυχαία) και οποιοδήποτε κιτ. Χωρίς όριο χρόνου — το ρολόι μετρά μόνο προς τα πάνω.',
  'free_field.weather': 'ΚΑΙΡΟΣ',
  'free_field.weather_note': 'Προεπιλογές · το τυχαίο ξαναρίχνει seed και ριπές',
  'free_field.weather_random': 'Τυχαίο σε κάθε GO HOT',
  'free_field.biome': 'ΤΟΠΙΟ',
  'free_field.biome_note': 'Έδαφος, αντικείμενα, ορίζοντας · μαλακά αντικείμενα κλίνουν στον άνεμο',
  'free_field.biome_random': 'Τυχαίο σε κάθε GO HOT',
  'free_field.randomise': 'ΞΑΝΑ',
  'free_field.randomise_all': 'ΑΝΑΚΑΤΕΜΑ ΠΛΑΚΩΝ + ΚΑΙΡΟΥ + ΤΟΠΙΟΥ',
  'free_field.weather_rerolled': 'Νέο seed καιρού',
  'free_field.shuffled': 'Η σειρά ανακατεύτηκε',
  'free_field.targets': 'ΠΛΑΚΕΣ',
  'free_field.target_n': 'ΠΛΑΚΑ {n}',
  'free_field.range_hidden': 'απόσταση κρυφή',
  'free_field.unknown_on': 'ΑΓΝΩΣΤΗ',
  'free_field.unknown_off': 'ΓΝΩΣΤΗ',
  'free_field.all_unknown': 'ΚΡΥΨΕ ΟΛΕΣ ΤΙΣ ΑΠΟΣΤΑΣΕΙΣ',
  'free_field.rounds': 'ΦΥΣΙΓΓΙΑ',
  'free_field.kit': 'ΣΤΟ ΟΠΛΟ',
  'free_field.kit_btn': 'ΚΙΤ (ΟΠΟΙΟΔΗΠΟΤΕ)',
  'free_field.go': 'ΕΝΗΜΕΡΩΣΗ & ΒΟΛΗ',
  'stage.free-field.name': 'Ελεύθερο Πεδίο',
  'stage.free-field.brief':
    'Η σειρά σου, ο καιρός σου, το κιτ σου. Χωρίς όριο χρόνου — το ρολόι μετρά μόνο πάνω. Χτύπα κάθε πλάκα· όταν οι αποστάσεις είναι κρυφές, μέτρα με mil ή χρησιμοποίησε τηλεμετρητή.',

  // --- common ---
  'common.menu': 'ΜΕΝΟΥ',
  'common.back': 'ΠΙΣΩ',
  'common.cr': '{n} cr',

  // --- settings ---
  'settings.title': 'ΡΥΘΜΙΣΕΙΣ',
  'settings.imperial': 'ΑΓΓΛΙΚΕΣ ΜΟΝΑΔΕΣ',
  'settings.imperial_note': 'γιάρδες, ίντσες και Φαρενάιτ',
  'settings.invert': 'ΑΝΤΙΣΤΡΟΦΗ ΣΥΡΣΙΜΟΥ',
  'settings.invert_note': 'σύρε την εικόνα αντί για το όπλο',
  'settings.sound_section': 'ΗΧΟΣ',
  'settings.sound': 'ΚΥΡΙΟΣ',
  'settings.sound_note': 'όλος ο ήχος ανοιχτός ή κλειστός',
  'settings.master_volume': 'ΕΝΤΑΣΗ ΚΥΡΙΟΥ',
  'settings.sound_sfx': 'ΚΥΡΙΟΙ ΗΧΟΙ',
  'settings.sound_sfx_note': 'βολές, κτυπήματα, κλείστρο, UI',
  'settings.sound_env': 'ΠΕΡΙΒΑΛΛΟΝ',
  'settings.sound_env_note': 'άνεμος στο πεδίο',
  'settings.practice': 'ΛΕΙΤΟΥΡΓΙΑ ΕΞΑΣΚΗΣΗΣ',
  'settings.practice_note':
    'πλήρεις λύσεις, χωρίς όριο χρόνου, και η ταχύτητα δεν κόβει πόντους — βαθμολογία και credits μετράνε',
  'settings.aim_sens': 'ΕΥΑΙΣΘΗΣΙΑ ΣΚΟΠΕΥΣΗΣ',
  'settings.aim_note':
    'Η σκόπευση είναι ανά ακτίνιο, οπότε μεγαλύτερη μεγέθυνση είναι αυτόματα λεπτότερη. Αυτό αλλάζει μόνο τη συνολική σχέση.',
  'settings.language': 'ΓΛΩΣΣΑ',
  'settings.language_note': 'Αγγλικά ή Ελληνικά στο περιβάλλον',
  'settings.controls': 'ΧΕΙΡΙΣΤΗΡΙΑ',
  'settings.controls_touch': 'Αφή',
  'settings.controls_mouse': 'Ποντίκι',
  'settings.controls_touch_note': 'Σύρε για σκόπευση · τσίμπημα ζουμ · ΚΡΑΤΑ και ΒΟΛΗ στη μπάρα',
  'settings.controls_mouse_note':
    'Σύρε σκόπευση · τροχός ζουμ · δεξί = ανάσα · αριστερό ή Space = βολή',
  'settings.glossary': 'ΑΝΟΙΓΜΑ ΓΛΩΣΣΑΡΙΟΥ',
  'settings.debug_section': 'DEBUG (ΠΡΟΣΩΡΙΝΟ)',
  'settings.free_shop': 'ΞΕΚΛΕΙΔΩΜΑ ΟΠΛΟΣΤΑΣΙΟΥ + ΟΛΩΝ ΤΩΝ ΣΤΑΔΙΩΝ',
  'settings.free_shop_confirm': 'ΣΙΓΟΥΡΑ; ΠΑΤΑ ΞΑΝΑ ΓΙΑ DEBUG ΞΕΚΛΕΙΔΩΜΑ',
  'settings.free_shop_off': 'DEBUG ΞΕΚΛΕΙΔΩΜΑ ΕΝΕΡΓΟ — ΠΑΤΑ ΓΙΑ ΑΠΕΝΕΡΓΟΠΟΙΗΣΗ',
  'settings.free_shop_note':
    'Προσωρινό debug. Τα είδη οπλοστασίου κοστίζουν 0 credits και όλα τα στάδια του Course of Fire είναι ανοιχτά. Δεν σβήνει πρόοδο. Απενεργοποίησέ το όποτε θες. Αφαίρεσέ το πριν δημόσια κυκλοφορία.',
  'settings.free_shop_enabled': 'Οπλοστάσιο δωρεάν · όλα τα στάδια ανοιχτά',
  'settings.free_shop_disabled': 'Τιμές και κλειδώματα σταδίων επανήλθαν',
  'settings.reset': 'ΕΠΑΝΑΦΟΡΑ ΠΡΟΟΔΟΥ',
  'settings.reset_confirm': 'ΠΑΤΑ ΞΑΝΑ ΓΙΑ ΟΛΙΚΗ ΔΙΑΓΡΑΦΗ',
  'settings.reset_note': 'εξοπλισμός, credits και κάθε σκορ',
  'settings.erased': 'Η πρόοδος διαγράφηκε',

  // --- stages list ---
  'stages.title': 'ΣΕΙΡΑ ΒΟΛΗΣ',
  'stages.meta': '{targets} στόχοι · έως {range} · {rounds} φυσίγγια · {weather} · {biome}',

  // --- scenery biomes ---
  'biome.open.name': 'Ανοιχτό Πεδίο',
  'biome.forest.name': 'Άκρη Δάσους',
  'biome.desert.name': 'Έρημος',
  'biome.urban.name': 'Αστική Ζώνη',
  'stages.locked': 'κλειδωμένο — πέτυχε {pct}% στο προηγούμενο στάδιο',
  'stages.not_shot': 'χωρίς βολή',
  'stages.record': '{pct}%  ·  {pts} πόντοι',

  // --- stage names & briefs ---
  'stage.tutorial.name': '00 — Πρώτες Βολές',
  'stage.tutorial.brief':
    'Τρεις μεγάλες πλάκες σε γνωστές αποστάσεις (100, 150, 200 m), ήρεμος αέρας, αρκετός χρόνος. Μάθε σκόπευση, ανάσα, βολή — και πώς ρυθμίζεις ύψος σε mil από την κάρτα δεδομένων πριν πατήσεις τη σκανδάλη.',
  'stage.zero.name': '01 — Cold Bore',
  'stage.zero.brief':
    'Πέντε πλάκες σε γνωστές αποστάσεις εντός 400 m, χωρίς ουσιαστικό άνεμο. Επιβεβαίωσε ότι το όπλο χτυπάει εκεί που λέει η κάρτα.',
  'stage.ranging.name': '02 — Υπολογισμοί',
  'stage.ranging.brief':
    'Άγνωστες αποστάσεις έως 650 m. Κανείς δεν θα σου πει πόσο μακριά είναι. Μέτρησε σε mil και κάνε τους υπολογισμούς.',
  'stage.wind.name': '03 — Ασταθής Κοιλάδα',
  'stage.wind.brief':
    'Κάθε σημαία λέει κάτι διαφορετικό και καμία δεν συμφωνεί για πολύ. Χρονίσε τις βολές, ή κράτα για το χειρότερο.',
  'stage.speed.name': '04 — Άσκηση Δέκα Δευτερολέπτων',
  'stage.speed.brief':
    'Οι πλάκες εμφανίζονται και φεύγουν. Η ταχύτητα είναι το σκορ. Ρύθμισε μία φορά για τη μέση απόσταση και κράτα το υπόλοιπο.',
  'stage.altitude.name': '05 — Αραιός Αέρας',
  'stage.altitude.brief':
    'Δύο χιλιάδες μέτρα πάνω από τη θάλασσα, σαράντα βαθμοί στο έδαφος, και mirage που βράζει. Η κάρτα δεδομένων εδώ είναι μύθος.',
  'stage.movers.name': '06 — Κινούμενοι Στόχοι',
  'stage.movers.brief':
    'Κινούνται. Προηγηθείτε κατά τον χρόνο πτήσης και ούτε εκατοστό παραπάνω — σε 700 m ένας κινούμενος θέλει σχεδόν ένα μέτρο.',
  'stage.storm.name': '07 — Τελευταίο Φως',
  'stage.storm.brief':
    'Παγωμένη βροχή, ριπές είκοσι μιλίων την ώρα και περίπου σαράντα λεπτά χρήσιμου φωτός. Όλα είναι άδικα — αυτός είναι ο στόχος.',
  'stage.mile.name': '08 — Το Μίλι',
  'stage.mile.brief':
    'Χίλια εξακόσια εννέα μέτρα. Φέρε κάτι που παραμένει υπερηχητικό όταν φτάνει, γιατί αλλιώς τίποτα δεν είναι προβλέψιμο.',

  // --- weather presets ---
  'weather.calm.name': 'Ήσυχο Πρωινό',
  'weather.fair.name': 'Ήπια Αύρα',
  'weather.desert.name': 'Υψηλή Έρημος',
  'weather.switch.name': 'Ασταθής Κοιλάδα',
  'weather.storm.name': 'Μέτωπο Έρχεται',
  'weather.arctic.name': 'Ψυχρό Κύμα',

  // --- brief ---
  'brief.tab.brief': 'ΕΝΗΜΕΡΩΣΗ',
  'brief.tab.weather': 'ΚΑΙΡΟΣ',
  'brief.tab.card': 'ΚΑΡΤΑ',
  'brief.tab.turrets': 'ΠΥΡΓΙΣΚΟΙ',
  'brief.go_hot': 'ΠΥΡΑ',
  'brief.on_the_rifle': 'ΣΤΟ ΟΠΛΟ',
  'brief.tutorial_dial_title': 'ΠΩΣ ΡΥΘΜΙΖΕΙΣ ΠΥΡΓΙΣΚΟΥΣ (MIL)',
  'brief.tutorial_dial_body':
    'Η κάρτα δεδομένων δείχνει πάντα ύψος σε mil. Ένα mil ≈ 10 cm διόρθωση στα 100 m (20 cm στα 200 m). Άνοιξε ΚΑΡΤΑ, βρες την απόσταση της πλάκας, διάβασε τη στήλη ΥΨΟΣ (mil). Άνοιξε ΠΥΡΓΙΣΚΟΙ και πάτα −− / − / 0 / + / ++ στο ύψος. Ρύθμισε μέχρι η γραμμή «περίπου … στην κάρτα» να ταιριάζει με την πλάκα. Σε γυαλί mil ο μεγάλος αριθμός πρέπει να ισούται με την κάρτα (συχνά 0,1 mil ανά κλικ). Σε γυαλί MOA (αρχικό σκοπευτικό) μην μετατρέπεις — εμπιστέψου τη γραμμή απόστασης. Παρέκκλιση στο 0 εδώ (πάτα 0). Μπορείς και ζωντανά με ΡΥΘΜΙΣΗ.',
  'brief.tutorial_dial_steps':
    '1) ΚΑΡΤΑ → ΥΨΟΣ (mil) για 100 / 150 / 200 m   ·   2) ΠΥΡΓΙΣΚΟΙ → ρύθμισε ύψος μέχρι να ταιριάζει η απόσταση   ·   3) Παρέκκλιση 0   ·   4) ΠΥΡΑ · ανάσα · βολή',
  'brief.tutorial_begin': 'ΕΝΑΡΞΗ ΟΔΗΓΟΥ',
  'brief.tutorial_replay': 'ΕΠΑΝΑΛΗΨΗ ΟΔΗΓΟΥ',
  'brief.tutorial_done_badge': 'ΟΔΗΓΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ',
  'brief.go_hot_ready': 'ΠΥΡΑ — ΕΙΣΑΙ ΕΤΟΙΜΟΣ',

  // --- dial coach ---
  'coach.header': 'ΟΔΗΓΟΣ ΠΥΡΓΙΣΚΩΝ  ·  ΒΗΜΑ {n} / {total}',
  'coach.next': 'ΕΠΟΜΕΝΟ',
  'coach.back': 'ΠΙΣΩ',
  'coach.close': 'ΚΛΕΙΣΙΜΟ',
  'coach.finish': 'ΤΕΛΟΣ',
  'coach.next_locked': 'ολοκλήρωσε την ενέργεια για συνέχεια',
  'coach.complete_toast': 'Οδηγός ολοκληρώθηκε — οι πυργίσκοι είναι δικοί σου',
  'coach.verify.ok': '✓ Σωστά — πάτα ΕΠΟΜΕΝΟ',
  'coach.verify.elev':
    'Πάτα + στο ύψος μέχρι η «περίπου απόσταση» να γράφει {range} (τώρα {about}). Κάρτα ≈ {elev} mil · έχεις {dial} mil',
  'coach.verify.wind': 'Πάτα 0 στην παρέκκλιση ώστε να είναι στο μηχανικό μηδέν',
  'coach.shot.intro': 'ΟΘΟΝΗ · ΠΡΩΤΕΣ ΒΟΛΕΣ',
  'coach.shot.mils': 'ΟΘΟΝΗ · ΤΙ ΕΙΝΑΙ ΤΟ MIL',
  'coach.shot.card': 'ΟΘΟΝΗ · ΚΑΡΤΑ ΔΕΔΟΜΕΝΩΝ',
  'coach.shot.tabs': 'ΟΘΟΝΗ · ΚΑΡΤΕΛΕΣ',
  'coach.shot.turrets': 'ΟΘΟΝΗ · ΠΥΡΓΙΣΚΟΙ',
  'coach.shot.ready': 'ΟΘΟΝΗ · ΠΥΡΑ',
  'coach.shot.reticle': 'σταυρωνικά',
  'coach.shot.card_preview': 'ΑΠΟΣΤΑΣΗ · ΥΨΟΣ (mil) · ΑΝΕΜΟΣ · TOF',
  'coach.shot.turret_preview': '−−  −  0  +  ++   ύψος & παρέκκλιση',
  'coach.shot.brief_preview': 'Ενημέρωση σειράς και κιτ',
  'coach.shot.hold_fire': 'Κράτα ανάσα · πάτα σκανδάλη',
  'coach.step.intro.title': 'Καλώς ήρθες στον οδηγό πυργίσκων',
  'coach.step.intro.body':
    'Αυτός ο οδηγός χρησιμοποιεί οθόνες σαν το πραγματικό παιχνίδι. Θα μάθεις να διαβάζεις την κάρτα και να ρυθμίζεις ύψος πριν πατήσεις ΠΥΡΑ. Τρεις πλάκες σε γνωστές αποστάσεις: 100, 150 και 200 m. Πάτα ΕΠΟΜΕΝΟ· στα βήματα εξάσκησης πρέπει να ρυθμίσεις σωστά πριν ξεκλειδώσει.',
  'coach.step.mils.title': 'Τι είναι το mil',
  'coach.step.mils.body':
    'Ένα mil είναι γωνία: περίπου 10 cm διόρθωση στα 100 m (20 cm στα 200 m). Η κάρτα δείχνει ύψος σε mil. Οι πυργίσκοι κινούνται σε σταθερά κλικ (συχνά 0,1 mil ή ¼ MOA). Σε γυαλί MOA μην μετατρέπεις με το χέρι — κοίτα τη γραμμή «περίπου απόσταση».',
  'coach.step.open_card.title': 'Άνοιξε την καρτέλα ΚΑΡΤΑ',
  'coach.step.open_card.body':
    'Στην ενημέρωση, οι καρτέλες είναι ΕΝΗΜΕΡΩΣΗ · ΚΑΙΡΟΣ · ΚΑΡΤΑ · ΠΥΡΓΙΣΚΟΙ. Η κάρτα έχει drop και holds για το φορτίο σου. Το στιγμιότυπο δείχνει αυτή την καρτέλα — στο παιχνίδι είναι η τρίτη.',
  'coach.step.read_card.title': 'Διάβασε τη στήλη ΥΨΟΣ',
  'coach.step.read_card.body':
    'Κάθε γραμμή είναι απόσταση. ΥΨΟΣ είναι mils για εκείνη την απόσταση. Οι πλάκες 100 / 150 / 200 m τονίζονται όταν πέφτουν σε γραμμές εκατοντάδων μέτρων. Βρες τον αριθμό για την πλάκα που θα χτυπήσεις.',
  'coach.step.pick_row.title': 'Εστίασε στην πλάκα 200 m',
  'coach.step.pick_row.body':
    'Η κάρτα έχει γραμμές ανά 100 m, οπότε τα 150 m δεν εμφανίζονται ποτέ ως «περίπου απόσταση». Εξασκούμαστε στα 200 m — πραγματική γραμμή στην κάρτα και πραγματική πλάκα. Σημείωσε το ΥΨΟΣ (mil). Μετά ρυθμίζεις μέχρι να λέει «περίπου 200 m».',
  'coach.step.open_turrets.title': 'Άνοιξε την καρτέλα ΠΥΡΓΙΣΚΟΙ',
  'coach.step.open_turrets.body':
    'Οι πυργίσκοι είναι η τέταρτη καρτέλα. Μπορείς και με ΡΥΘΜΙΣΗ όσο τρέχει το στάδιο. Το στιγμιότυπο δείχνει ΠΥΡΓΙΣΚΟΙ ενεργό — εκεί ζουν τα κλικ ύψους και παρέκκλισης.',
  'coach.step.turret_layout.title': 'Χειριστήρια ύψους',
  'coach.step.turret_layout.body':
    'Χρησιμοποίησε −− − 0 + ++ στο ύψος. Το + προσθέτει ύψος· το − αφαιρεί. Το 0 επιστρέφει στο μηχανικό μηδέν. Η μεγάλη ένδειξη είναι η τιμή· η γραμμή από κάτω την αντιστοιχεί σε απόσταση κάρτας.',
  'coach.step.dial_elev.title': 'Σειρά σου — ρύθμισε για 200 m',
  'coach.step.dial_elev.body':
    'Χρησιμοποίησε τα ζωντανά χειριστήρια κάτω από το στιγμιότυπο. Πάτα + στο ύψος μέχρι η γραμμή να λέει περίπου 200 m (όχι 100 m). Στο αρχικό σκοπευτικό MOA μπορεί να θέλεις αρκετά κλικ — κοίτα την «περίπου απόσταση». Το ΕΠΟΜΕΝΟ ξεκλειδώνει όταν η απόσταση είναι 200 m.',
  'coach.step.wind_zero.title': 'Μηδένισε την παρέκκλιση',
  'coach.step.wind_zero.body':
    'Σε αυτό το στάδιο δεν υπάρχει ουσιαστικός άνεμος. Πάτα 0 στην παρέκκλιση. Το ΕΠΟΜΕΝΟ ξεκλειδώνει όταν τα κλικ παρέκκλισης είναι 0.',
  'coach.step.ready.title': 'Έτοιμος για ΠΥΡΑ',
  'coach.step.ready.body':
    'Μπορείς να ξανανοίξεις ΚΑΡΤΑ ή ΠΥΡΓΙΣΚΟΥΣ πριν την ΠΥΡΑ, και ΡΥΘΜΙΣΗ όσο τρέχει το στάδιο. Κράτα ανάσα, μετά σκανδάλη. Ολοκλήρωσε τον οδηγό και πάτα ΠΥΡΑ στην ενημέρωση για τις Πρώτες Βολές.',
  'brief.the_course': 'Η ΣΕΙΡΑ',
  'brief.gear': 'ΕΞΟΠΛΙΣΜΟΣ',
  'brief.nothing_fitted': 'τίποτα τοποθετημένο',
  'brief.zero': 'ΜΗΔΕΝΙΣΜΟΣ',
  'brief.targets': 'ΣΤΟΧΟΙ',
  'brief.scenery': 'ΤΟΠΙΟ',
  'brief.rounds': 'ΦΥΣΙΓΓΙΑ',
  'brief.time_limit': 'ΟΡΙΟ ΧΡΟΝΟΥ',
  'brief.time_count_up': 'χωρίς όριο · το ρολόι μετρά πάνω',
  'brief.time_practice': 'χωρίς όριο (εξάσκηση)',
  'brief.par': 'PAR ΑΝΑ ΣΤΟΧΟ',
  'brief.par_free': 'χωρίς βαθμολογία ταχύτητας',
  'brief.ranges': 'ΑΠΟΣΤΑΣΕΙΣ',
  'brief.ranges_known': 'όλες γνωστές',
  'brief.ranges_unknown': 'όλες κρυφές',
  'brief.ranges_mixed': '{n} κρυφές',
  'brief.ranging': 'ΜΕΤΡΗΣΗ',
  'brief.ranging_lrf': 'αποστασιόμετρο τοποθετημένο',
  'brief.ranging_mil': 'μέτρησε σε mil μόνος σου',
  'brief.solution': 'ΛΥΣΗ',
  'brief.solution_yes': 'υπολογιστής τοποθετημένος',
  'brief.solution_no': 'διάβασέ το από την κάρτα',
  'brief.weather': 'ΚΑΙΡΟΣ',
  'brief.weather_yes': 'μετεωρόμετρο τοποθετημένο',
  'brief.weather_no': 'εκτίμησέ το',
  'brief.fps_today': '{fps} fps σήμερα',
  'brief.fps_claimed': '{fps} fps (κουτί)',
  'brief.fps_chrono': '{fps} fps μετρημένα σήμερα',
  'brief.chrono': 'CHRONO',
  'brief.chrono_yes': 'χρονογράφος — πραγματικό MV ανά βολή',
  'brief.chrono_no': 'χωρίς chrono — μόνο ταχύτητα κουτιού',
  'brief.traj': 'ΔΙΑΔΡΟΜΗ',
  'brief.traj_yes': 'καταγραφέας τροχιάς — πλευρική όψη κάθε βολής',
  'brief.traj_no': 'χωρίς plotter — μόνο σύντομο ίχνος στο γυαλί',
  'brief.moa_cone': 'κώνος {moa} MOA',
  'brief.mil_travel': '{mils} MIL διαδρομή',
  'brief.transonic_warn':
    'Αυτό το βλήμα γίνεται διαηχητικό στα {range} και οι μακρινοί στόχοι είναι πέρα από εκεί. Περίμενε να ανοίξουν οι ομάδες.',

  // --- armoury ---
  'armoury.title': 'ΟΠΛΟΣΤΑΣΙΟ',
  'armoury.title_free': 'ΚΙΤ ΕΛΕΥΘΕΡΟΥ ΠΕΔΙΟΥ',
  'armoury.free_kit_badge': 'ΟΠΟΙΟΔΗΠΟΤΕ',
  'armoury.tab.rifle': 'ΟΠΛΟ',
  'armoury.tab.ammo': 'ΠΥΡΟΜ.',
  'armoury.tab.optic': 'ΟΠΤΙΚΑ',
  'armoury.tab.muzzle': 'ΣΤΟΜΙΟ',
  'armoury.tab.support': 'ΣΤΗΡΙΞΗ',
  'armoury.tab.gear': 'ΕΞΟΠΛ.',
  'armoury.fitted': 'ΤΟΠΟΘ.',
  'armoury.owned': 'ΑΓΟΡΑΣΜ.',
  'armoury.fit': 'ΤΟΠΟΘ.',
  'armoury.pockets_full': 'και οι τρεις θέσεις είναι γεμάτες',
  'armoury.not_chambered': 'Το {rifle} δεν είναι θαλαμωμένο για αυτό',
  'armoury.ammo_switched': 'Πυρομαχικά άλλαξαν σε {name}',
  'armoury.bought': 'Αγοράστηκε {name}',
  'armoury.no_gear': 'χωρίς εξοπλισμό',
  'armoury.gear_count': '{n}/{max} εξοπλισμός',
  'armoury.beyond_card': 'πέρα από την κάρτα',
  'armoury.stat.chambering': 'ΘΑΛΑΜΩΣΗ',
  'armoury.stat.barrel': 'ΚΑΝΝΗ / ΣΤΡΟΦΗ',
  'armoury.stat.precision': 'ΑΚΡΙΒΕΙΑ',
  'armoury.stat.cycle': 'ΚΥΚΛΟΣ',
  'armoury.stat.mass': 'ΜΑΖΑ',
  'armoury.stat.rail': 'ΡΑΓΑ',
  'armoury.stat.bullet': 'ΒΛΗΜΑ',
  'armoury.stat.bc': 'BC',
  'armoury.stat.velocity': 'ΤΑΧΥΤΗΤΑ',
  'armoury.stat.velocity_sd': 'SD ΤΑΧΥΤΗΤΑΣ',
  'armoury.stat.dispersion': 'ΔΙΑΣΠΟΡΑ',
  'armoury.stat.magnification': 'ΜΕΓΕΘΥΝΣΗ',
  'armoury.stat.turrets': 'ΠΥΡΓΙΣΚΟΙ',
  'armoury.stat.travel': 'ΔΙΑΔΡΟΜΗ',
  'armoury.stat.reticle': 'ΣΤΑΥΡΩΝΙΚΑ',
  'armoury.stat.glass': 'ΓΥΑΛΙ',
  'armoury.stat.recoil': 'ΑΝΑΚΡΟΥΣΗ',
  'armoury.stat.signature': 'ΥΠΟΓΡΑΦΗ',
  'armoury.stat.report': 'ΚΡΟΤΟΣ',
  'armoury.stat.hold': 'ΚΡΑΤΗΜΑ',
  'armoury.stat.drift': 'ΡΥΘΜΟΣ ΔΡΙΦΤ',
  'armoury.stat.setup': 'ΣΤΗΡΙΞΗ',
  'armoury.stat.muzzle': 'ΣΤΟΜΙΟ',
  'armoury.stat.group': 'ΟΜΑΔΑ',
  'armoury.stat.stability': 'ΣΤΑΘΕΡΟΤΗΤΑ',
  'armoury.stat.transonic': 'ΔΙΑΗΧΗΤΙΚΟ',
  'armoury.wobble': '{pct}% τρέμουλο',
  'armoury.travel_up': '{mils} MIL πάνω',
  'armoury.details': 'ΛΕΠΤΟΜ.',
  'armoury.details_close': 'ΚΛΕΙΣΙΜΟ',
  'armoury.details_title': 'ΛΕΠΤΟΜΕΡΕΙΕΣ',
  'armoury.image_soon': 'Η εικόνα έρχεται σύντομα',
  'armoury.image_hint': 'Θέση για φωτογραφία — το artwork θα προστεθεί αργότερα',
  'armoury.image_loading': 'Φόρτωση…',
  'armoury.field_notes': 'ΣΗΜΕΙΩΣΕΙΣ ΠΕΔΙΟΥ',
  'armoury.spec_sheet': 'ΦΥΛΛΟ ΠΡΟΔΙΑΓΡΑΦΩΝ',

  // --- shoot HUD ---
  'shoot.exit': 'ΕΞΟΔΟΣ',
  'shoot.abandon': 'ΕΓΚΑΤΑΛΕΙΨΗ;',
  'shoot.elev': 'ΥΨΟΣ',
  'shoot.wind': 'ΑΝΕΜΟΣ',
  'shoot.mag': 'ΜΕΓ.',
  'shoot.rounds': 'ΦΥΣΙΓ.',
  'shoot.clock': 'ΧΡΟΝΟΣ',
  'shoot.clock_practice': '∞',
  'shoot.plates': 'ΠΛΑΚΕΣ',
  'shoot.chrono': 'CHRONO',
  'shoot.chrono_ready': '—',
  'shoot.chrono_avg': 'μέσο {fps} fps',
  'shoot.chrono_shot': 'chrono {fps} fps',
  'shoot.breathe': 'ΑΝΑΠΝΕΥΣΕ',
  'shoot.holding': 'ΚΡΑΤΗΜΑ {s}s',
  'shoot.breathing': 'ΑΝΑΠΝΟΗ',
  'shoot.cycling': 'ΚΛΕΙΔΩΜΑ',
  'shoot.recovering': 'ΑΝΑΚΑΜΨΗ',
  'shoot.range_unknown': '{mils} mil ύψος — άγνωστη απόσταση',
  'shoot.mil_title': 'ΑΠΟΣΤΑΣΗ ΑΠΟ ΣΤΑΥΡΩΝΙΚΑ',
  'shoot.mil_hint': 'σύρε πάνω στον στόχο, από πάνω προς τα κάτω',
  'shoot.no_targets': 'χωρίς στόχους',
  'shoot.record_it': 'ΚΑΤΑΓΡΑΦΗ',
  'shoot.recorded': 'Καταγράφηκε {range}',
  'shoot.reticle_first': 'Βάλε πρώτα τα σταυρωνικά στον στόχο',
  'shoot.find': 'ΕΠΟΜΕΝΟΣ',
  'shoot.tool.wind': 'ΑΝΕΜΟΣ',
  'shoot.tool.card': 'ΚΑΡΤΑ',
  'shoot.tool.dial': 'ΠΥΡΓ.',
  'shoot.tool.solve': 'ΛΥΣΗ',
  'shoot.tool.mil': 'MIL',
  'shoot.tool.traj': 'ΤΡΟΧΙΑ',
  'shoot.hold': 'ΚΡΑΤΑ',
  'shoot.fire': 'ΒΟΛΗ',
  'shoot.fire_mouse': 'ΒΟΛΗ / SPACE',
  'shoot.empty': 'ΑΔΕΙΟ',
  'shoot.out_of_air': 'Τέλος αέρα — ανάπνευσε',
  'shoot.out_of_ammo': 'Τέλος πυρομαχικών',
  'shoot.nothing_up': 'Τίποτα όρθιο αυτή τη στιγμή',
  'shoot.dialled': 'Ρυθμίστηκε',
  'shoot.lost_splash': 'Χάθηκε το splash. Χωρίς κλήση.',
  'shoot.round_dirt': 'Βολή στο χώμα.',
  'shape.gong': 'ΓΚΟΝΓΚ',
  'shape.silhouette': 'ΣΙΛΟΥΕΤΑ',
  'shape.head': 'ΚΕΦΑΛΙ',
  'shape.diamond': 'ΡΟΜΒΟΣ',

  // --- spotter ---
  'spotter.none': 'Χωρίς κλήση — τίποτα εκεί έξω.',
  'spotter.short': 'Κοντό. Δεν έφτασε ποτέ.',
  'spotter.centre': 'Κέντρο. Καλή βολή.',
  'spotter.hit': 'Εύστοχο.',
  'spotter.edge': 'Άκρη της πλάκας. Μέτρησε.',
  'spotter.splash': 'Splash στην άκρη. Ξαναστείλτο.',
  'spotter.miss': 'Άστοχο — έλα {parts}.',
  'spotter.high': 'ψηλά',
  'spotter.low': 'χαμηλά',
  'spotter.right': 'δεξιά',
  'spotter.left': 'αριστερά',
  'spotter.and': ' και ',

  // --- result ---
  'result.frh': 'ΕΥΣΤΟΧΙΑ ΠΡΩΤΗΣ ΒΟΛΗΣ',
  'result.plates': 'ΠΛΑΚΕΣ',
  'result.rounds': 'ΦΥΣΙΓΓΙΑ',
  'result.time': 'ΧΡΟΝΟΣ',
  'result.mean_miss': 'ΜΕΣΟ ΣΦΑΛΜΑ',
  'result.payout': 'ΑΜΟΙΒΗ',
  'result.first_round': 'πρώτη βολή',
  'result.n_rounds': '{n} φυσίγγια',
  'result.centred': '{pct}% κέντρο',
  'result.no_hit': '{n} φυσίγγια, χωρίς εύστοχο',
  'result.never': 'ποτέ δεν στοχεύτηκε',
  'result.again': 'ΞΑΝΑ ΒΟΛΗ',
  'result.course': 'ΣΕΙΡΑ ΒΟΛΗΣ',
  'result.free_field_setup': 'ΡΥΘΜΙΣΗ ΕΛΕΥΘΕΡΟΥ ΠΕΔΙΟΥ',
  'result.free_field_done': 'Ελεύθερο Πεδίο ολοκληρώθηκε',
  'result.free_field_done_detail': 'Sandbox — χωρίς credits και χωρίς ξεκλειδώματα πορείας.',
  'result.payout_free': '—',
  'result.menu': 'ΚΥΡΙΟ ΜΕΝΟΥ',
  'result.view_target': 'ΠΡΟΒΟΛΗ',
  'result.view_title': '{shape} · {range}',
  'result.view_hint': 'Μόνο εύστοχα · αρίθμηση σειράς βολής · κέντρο = κέντρο πλάκας',
  'result.view_close': 'ΚΛΕΙΣΙΜΟ',
  'result.view_hits': '{n} εύστοχο/α στην πλάκα',
  'result.view_legend': 'Πράσινο = κέντρο · πορτοκαλί = καλό · μπλε = άκρη',
  'result.view_no_hits': 'Κανένα εύστοχο σε αυτή την πλάκα',
  'result.view_right': 'ΔΕΞΙΑ →',
  'result.view_up': '↑ ΠΑΝΩ',
  'result.chrono_line': 'CHRONO · {n} βολές · μέσο {mean} fps · ES {es} · SD {sd}',
  'result.unlock_yes': 'Ξεκλείδωσε: {name}',
  'result.unlock_yes_detail': 'Πέρασες το όριο {pct}% σε αυτό το στάδιο.',
  'result.unlock_no': 'Ακόμα κλειδωμένο: {name}',
  'result.unlock_no_detail': 'Χρειάζεσαι {need}% · έχεις {have}% · λείπουν {pts} πόντοι',
  'result.unlock_final': 'Τέλος σειράς',
  'result.unlock_final_detail': 'Δεν υπάρχει επόμενο στάδιο — κυνηγήσε υψηλότερο βαθμό.',
  'result.tutorial_done': 'Η εκπαίδευση ολοκληρώθηκε',
  'result.tutorial_next': 'Το Cold Bore και η υπόλοιπη σειρά είναι ανοιχτά — επόμενο: {name}.',
  'result.next_grade': 'Επόμενο: {grade} στο {pct}% · {pts} πόντοι ακόμα',
  'result.top_grade': 'Κορυφαίος βαθμός',
  'result.score_how': 'ΠΩΣ ΧΤΙΣΤΗΚΕ ΤΟ ΣΚΟΡ',
  'result.part_hit': 'ΕΥΣΤΟΧΟ',
  'result.part_first': '1η ΒΟΛΗ',
  'result.part_speed': 'ΤΑΧΥΤΗΤΑ',
  'result.score_legend': 'Τα εύστοχα πληρώνουν περισσότερο · 1η βολή & ταχύτητα είναι μπόνους',

  // --- career ---
  'career.title': 'ΚΑΡΙΕΡΑ',
  'career.tab.overview': 'ΣΤΑΤ',
  'career.tab.stages': 'ΣΤΑΔΙΑ',
  'career.tab.history': 'ΙΣΤΟΡΙΚΟ',
  'career.tab.achievements': 'ΜΕΤΑΛΛΙΑ',
  'career.stat.runs': 'ΣΕΙΡΕΣ ΒΟΛΗΣ',
  'career.stat.runs_sub': '{course} σειρά · {free} ελεύθερο',
  'career.stat.stages': 'ΣΤΑΔΙΑ ΠΟΥ ΚΑΘΑΡΙΣΑΝ',
  'career.stat.shots': 'ΦΥΣΙΓΓΙΑ',
  'career.stat.frh': 'FRH ΚΑΡΙΕΡΑΣ',
  'career.stat.frh_sub': 'εύστοχες 1ης βολής / πλάκες',
  'career.stat.mean_miss': 'ΜΕΣΟ ΑΣΤΟΧΟ',
  'career.stat.mean_miss_sub': 'ακτινικό, σταθμισμένο, mil',
  'career.stat.best_grade': 'ΚΑΛΥΤΕΡΟΣ ΒΑΘΜΟΣ',
  'career.stat.points': 'ΠΟΝΤΟΙ',
  'career.stat.credits': 'CREDIT ΠΟΥ ΚΕΡΔΙΣΘΗΚΑΝ',
  'career.stat.perfect_frh': 'ΚΑΘΑΡΑ FRH',
  'career.stat.distinguished': 'ΔΙΑΚΕΚΡΙΜΕΝΕΣ ΣΕΙΡΕΣ',
  'career.stat.achievements': 'ΕΠΙΤΕΥΓΜΑΤΑ',
  'career.stage.never': 'Χωρίς προσπάθεια',
  'career.stage.line': 'Καλύτερο {pct}% · {attempts} προσπάθειες · FRH {frh}',
  'career.stage.cleared': 'ΚΑΘΑΡΟ',
  'career.stage.open': 'ανοιχτό',
  'career.history.empty': 'Δεν υπάρχουν ακόμα σειρές. Τελείωσε ένα στάδιο για να ξεκινήσει το ιστορικό.',
  'career.history.line': '{pct}% · {hits}/{targets} πλάκες · FRH {frh}% · {time}δ',
  'career.tag.practice': 'εξάσκηση',
  'career.tag.free_field': 'ελεύθερο',
  'career.tag.cleared': 'καθαρό',
  'career.achievements.header': '{n} από {total} ξεκλείδωτα',
  'career.achievement.locked': 'Κλειδωμένο',
  'career.achievement.locked_hint': 'Συνέχισε — τα κριτήρια μένουν κρυφά μέχρι να τα κερδίσεις.',
  'career.tier.bronze': 'ΧΑΛΚΟΣ',
  'career.tier.silver': 'ΑΣΗΜΙ',
  'career.tier.gold': 'ΧΡΥΣΟΣ',
  'career.unlocked_toast': 'Μετάλλιο: {name}',
  'career.unlocked_more': '+{n} ακόμα μετάλλια',

  'achieve.first_string.name': 'Πρώτη σειρά',
  'achieve.first_string.desc': 'Ολοκλήρωσε οποιοδήποτε στάδιο ή Ελεύθερο Πεδίο.',
  'achieve.first_clear.name': 'Πρώτο καθαρό',
  'achieve.first_clear.desc': 'Χτύπα όλες τις πλάκες σε στάδιο της σειράς.',
  'achieve.tutorial_done.name': 'Σχολή',
  'achieve.tutorial_done.desc': 'Ολοκλήρωσε την εκπαίδευση First Shots.',
  'achieve.zero_qualified.name': 'Cold Bore Επαρκής',
  'achieve.zero_qualified.desc': 'Φτάσε Επαρκή ή καλύτερα στο στάδιο 01.',
  'achieve.ranging_clear.name': 'Εκτιμήσεις',
  'achieve.ranging_clear.desc': 'Καθάρισε το στάδιο ranging.',
  'achieve.wind_clear.name': 'Αναγνώστης ανέμου',
  'achieve.wind_clear.desc': 'Καθάρισε το στάδιο ανέμου.',
  'achieve.movers_clear.name': 'Προήγηση',
  'achieve.movers_clear.desc': 'Καθάρισε το στάδιο movers.',
  'achieve.storm_clear.name': 'Στη θύελλα',
  'achieve.storm_clear.desc': 'Καθάρισε το στάδιο θύελλας.',
  'achieve.mile_clear.name': 'Χάλυβας στο μίλι',
  'achieve.mile_clear.desc': 'Καθάρισε το στάδιο του μιλίου.',
  'achieve.course_complete.name': 'Πλήρης σειρά',
  'achieve.course_complete.desc': 'Καθάρισε όλα τα βαθμολογούμενα στάδια.',
  'achieve.grade_marksman.name': 'Κορδέλα σκοπευτή',
  'achieve.grade_marksman.desc': 'Marksman ή καλύτερα σε οποιοδήποτε στάδιο.',
  'achieve.grade_expert.name': 'Κορδέλα ειδικού',
  'achieve.grade_expert.desc': 'Expert ή καλύτερα σε οποιοδήποτε στάδιο.',
  'achieve.grade_distinguished.name': 'Κορδέλα εξαίρετου',
  'achieve.grade_distinguished.desc': 'Distinguished σε οποιοδήποτε στάδιο.',
  'achieve.cold_bore_distinguished.name': 'Cold Bore master',
  'achieve.cold_bore_distinguished.desc': 'Distinguished στο στάδιο 01 — Cold Bore.',
  'achieve.sharpshooter_trio.name': 'Τριάδα sharpshooter',
  'achieve.sharpshooter_trio.desc': 'Sharpshooter+ σε τρία στάδια.',
  'achieve.frh_perfect.name': 'Καθαρή 1η βολή',
  'achieve.frh_perfect.desc': 'Καθάρισε στάδιο (3+ πλάκες) με 100% FRH.',
  'achieve.frh_career_50.name': 'Σταθερές πρώτες',
  'achieve.frh_career_50.desc': 'FRH καριέρας ≥50% μετά από 20+ πλάκες.',
  'achieve.tight_group.name': 'Σφιχτή ομάδα',
  'achieve.tight_group.desc': 'Καθάρισε στάδιο με μέσο άστοχο ≤ 0.5 MIL.',
  'achieve.shots_100.name': 'Εκατό φυσίγγια',
  'achieve.shots_100.desc': 'Ρίξε 100 βολές στην καριέρα.',
  'achieve.shots_500.name': 'Πεντακόσια φυσίγγια',
  'achieve.shots_500.desc': 'Ρίξε 500 βολές στην καριέρα.',
  'achieve.credits_5k.name': 'Πορτοφόλι 5k',
  'achieve.credits_5k.desc': 'Κέρδισε 5.000 credits από πληρωμές σειράς.',
  'achieve.free_field_run.name': 'Δικό σου πεδίο',
  'achieve.free_field_run.desc': 'Ολοκλήρωσε σειρά Ελεύθερου Πεδίου.',
  'achieve.own_tree.name': 'Γυαλί Christmas tree',
  'achieve.own_tree.desc': 'Απόκτησε οπτική Ardent με tree reticle.',
  'achieve.full_sensors.name': 'Πλήρεις αισθητήρες',
  'achieve.full_sensors.desc': 'Απόκτησε LRF, μετεωρόμετρο και solver.',
  'achieve.attempts_ten.name': 'Δέκα φορές',
  'achieve.attempts_ten.desc': 'Δοκίμασε το ίδιο στάδιο δέκα φορές.',

  // --- grades ---
  'grade.Distinguished': 'Εξαίρετος',
  'grade.Expert': 'Ειδικός',
  'grade.Sharpshooter': 'Ελεύθερος Σκοπευτής',
  'grade.Marksman': 'Σκοπευτής',
  'grade.Qualified': 'Επαρκής',
  'grade.Unqualified': 'Ανεπαρκής',

  // --- panels: weather ---
  'panel.weather_meter': 'ΜΕΤΕΩΡΟΜΕΤΡΟ',
  'panel.field_estimate': 'ΕΚΤΙΜΗΣΗ ΠΕΔΙΟΥ',
  'panel.no_meter': 'χωρίς μετεωρόμετρο',
  'panel.temperature': 'ΘΕΡΜΟΚΡΑΣΙΑ',
  'panel.station_pressure': 'ΠΙΕΣΗ ΣΤΑΘΜΟΥ',
  'panel.humidity': 'ΥΓΡΑΣΙΑ',
  'panel.station_elevation': 'ΥΨΟΜΕΤΡΟ',
  'panel.density_altitude': 'ΥΨΟΣ ΠΥΚΝΟΤΗΤΑΣ',
  'panel.lat_facing': 'ΓΕΩΓΡ. ΠΛΑΤΟΣ / ΚΑΤΕΥΘΥΝΣΗ',
  'panel.wind': 'ΑΝΕΜΟΣ',
  'panel.metered_fp': 'μετρημένο στο σημείο βολής',
  'panel.read_flags': 'διάβασε τις σημαίες',
  'panel.da_off':
    'Ο αέρας είναι {delta} m ύψους πυκνότητας πιο {thinner} από ό,τι υποθέτει η κάρτα. Περίμενε να ρυθμίσεις {less}.',
  'panel.thinner': 'αραιός',
  'panel.thicker': 'πυκνός',
  'panel.less': 'λιγότερο',
  'panel.more': 'περισσότερο',
  'panel.da_ok': 'Ο αέρας είναι κοντά σε αυτό που υποθέτει η κάρτα.',
  'panel.crosswind_chart': 'πλαγιοάνεμος, τελευταία 30 s   κορυφή {peak}',
  'panel.now': 'τώρα',
  'panel.oclock': '{clock} η ώρα',
  'panel.oclock_speed': '{speed} @ {clock} η ώρα',

  // --- panels: data card ---
  'panel.data_card': 'ΚΑΡΤΑ ΔΕΔΟΜΕΝΩΝ',
  'panel.zeroed':
    'μηδενισμένο {zero} · τυπικός αέρας · η στήλη ανέμου είναι πλήρης τιμή 10 mph',
  'panel.range': 'ΑΠΟΣΤ.',
  'panel.elev': 'ΥΨΟΣ',
  'panel.tof': 'TOF',
  'panel.mach': 'MACH',
  'panel.transonic_beyond':
    'διαηχητικό πέρα από {range} — οι ομάδες ανοίγουν από εκεί και μετά',
  'panel.mil_divide': 'μέτρησε σε mil, διαίρεσε, διάβασε την κάρτα',

  // --- panels: turrets ---
  'panel.turrets': 'ΠΥΡΓΙΣΚΟΙ',
  'panel.clicks': '{n} κλικ',
  'panel.zero_btn': '0',
  'panel.elevation_travel': 'ΥΨΟΣ  ·  {mils} MIL διαδρομή',
  'panel.windage': 'ΠΑΡΕΚΚΛΙΣΗ',
  'panel.about_range': 'αυτό είναι περίπου {range} στην κάρτα',
  'panel.tutorial_dial_tip':
    'Εκπαίδευση: το ΥΨΟΣ στην κάρτα είναι πάντα mil. Ρύθμισε ύψος μέχρι η «περίπου απόσταση» να ταιριάζει με την πλάκα. Παρέκκλιση → 0. Γυαλί mil: ταίριαξε τον αριθμό mil· γυαλί MOA: εμπιστέψου τη γραμμή απόστασης.',
  'panel.magnification': 'ΜΕΓΕΘΥΝΣΗ',
  'panel.sfp_note':
    'δεύτερο εστιακό επίπεδο — τα σταυρωνικά είναι αληθή mil μόνο στα {mag}x',
  'panel.parallax': 'ΠΑΡΑΛΛΑΞΗ',

  // --- panels: solution ---
  'panel.firing_solution': 'ΛΥΣΗ ΒΟΛΗΣ',
  'panel.put_reticle': 'Βάλε τα σταυρωνικά σε στόχο για να υπολογιστεί λύση.',
  'panel.unknown_mil': 'άγνωστη — μέτρησέ την σε mil',
  'panel.angle': 'ΓΩΝΙΑ',
  'panel.target': 'ΣΤΟΧΟΣ',
  'panel.target_tall': '{cm} cm ύψος',
  'panel.no_solver':
    'Χωρίς βαλλιστικό υπολογιστή. Διάβασε το ύψος από την κάρτα για αυτή την απόσταση και διόρθωσε μόνος σου για αέρα και άνεμο.',
  'panel.card_elevation': 'ΥΨΟΣ ΚΑΡΤΑΣ',
  'panel.card_wind': 'ΑΝΕΜΟΣ ΚΑΡΤΑΣ / 10 MPH',
  'panel.solver_needs_range':
    'Ο υπολογιστής χρειάζεται απόσταση. Μέτρησε σε mil ή βάλε αποστασιόμετρο.',
  'panel.elevation': 'ΥΨΟΣ',
  'panel.time_of_flight': 'ΧΡΟΝΟΣ ΠΤΗΣΗΣ',
  'panel.at_target': 'ΣΤΟΝ ΣΤΟΧΟ',
  'panel.spin_drift': 'ΣΠΙΝ ΝΤΡΙΦΤ',
  'panel.spin_right': '{cm} cm δεξιά',
  'panel.lead': 'ΠΡΟΗΓΗΣΗ',
  'panel.dial_it': 'ΡΥΘΜΙΣΕ',
  'panel.not_enough_elev': 'ΑΝΕΠΑΡΚΕΣ ΥΨΟΣ',
  'panel.out_of_travel':
    'Το σκοπευτικό τελείωσε τη διαδρομή. Κράτα τη διόρθωση στα σταυρωνικά, ή βάλε γυαλί με περισσότερη.',

  // --- panels: trajectory ---
  'panel.traj_title': 'ΤΡΟΧΙΑ',
  'panel.traj_no_gear':
    'Χωρίς καταγραφέα τροχιάς. Τοποθέτησε έναν στο οπλοστάσιο για πλευρική όψη κάθε βολής.',
  'panel.traj_no_shot': 'Ρίξε μια βολή για να σχεδιαστεί η διαδρομή από το στόμιο ως το σημείο κρούσης.',
  'panel.traj_no_path': 'Δεν υπάρχουν δείγματα διαδρομής σε αυτή τη βολή.',
  'panel.traj_shot_n': 'βολή {n} / {total}',
  'panel.traj_hint': 'Πάτα ή σύρε την καμπύλη για απόσταση, ύψος και ταχύτητα σε εκείνο το σημείο',
  'panel.traj_probe': 'ΣΤΟΝ ΚΕΡΣΟΡΑ',
  'panel.traj_distance': 'ΑΠΟΣΤΑΣΗ',
  'panel.traj_height': 'ΥΨΟΣ',
  'panel.traj_speed': 'ΤΑΧΥΤΗΤΑ',
  'panel.traj_mach_tof': 'MACH · TOF',
  'panel.traj_impact': 'ΚΡΟΥΣΗ',
  'panel.traj_impact_speed': 'ΤΑΧΥΤΗΤΑ ΚΡΟΥΣΗΣ',
  'panel.traj_nearest': 'ΚΟΝΤΙΝΟΤΕΡΗ ΠΛΑΚΑ',
  'panel.traj_plate_height': 'ΥΨΟΣ ΠΛΑΚΑΣ (vs οπτικό)',
  'panel.traj_miss': 'ΑΣΤΟΧΙΑ ΣΤΗΝ ΠΛΑΚΑ',
  'panel.traj_hit': 'ΕΥΣΤΟΧΟ',

  // --- catalog: rifles ---
  'catalog.ranger24.name': 'Ranger M24',
  'catalog.ranger24.blurb':
    'Σχολικό όπλο με ξύλινο κοντάκι. Τίποτα δεν εντυπωσιάζει και τίποτα δεν πάει στραβά.',
  'catalog.ranger24.role': 'Κλείστρο εκπαίδευσης · .308 Winchester',
  'catalog.ranger24.detail':
    'Το Ranger M24 είναι το σχολικό όπλο: ξύλινο κοντάκι, κάννη 24 ιντσών και περιστροφή 1:11.25 που σταθεροποιεί κάθε κοινό match βλήμα .308 χωρίς δράμα. Τίποτα δεν είναι εξωτικό. Η ενέργεια κυκλοφορεί καθαρά, ο free-float σωλήνας δεν «περπατάει», και η ράγα 5.8 mil αφήνει αρκετό ύψος για κράτημα 800 m με match πυρομαχικά. Αρκετά βαρύ για να κάθεται στο μαξιλάρι, αρκετά ελαφρύ για μεγάλη μέρα. Αν μαθαίνεις άνεμο, μηδέν και σκανδάλη, αυτό είναι το εργαλείο που δεν θα σου κρύψει τα λάθη.',
  'catalog.ranger24.note.0':
    'Καλύτερα με 168–175 gr match· η αργή περιστροφή τα κρατάει σωστά πέρα από τα 700 m.',
  'catalog.ranger24.note.1':
    'Αργός κύκλος ανταμείβει ήρεμο follow-through — βιάσου στο κλείστρο και το πληρώνεις στην επόμενη πλάκα.',
  'catalog.ranger24.note.2':
    'Στάρτερ: δωρεάν, ειλικρινές, φιλικό στο μηδέν για τα πρώτα στάδια.',
  'catalog.mk14.name': 'Mk14 Marksman',
  'catalog.mk14.blurb':
    'Αερίου. Μισή ακρίβεια από τα κλείστρα, τετραπλάσια ταχύτητα δεύτερης βολής.',
  'catalog.mk14.role': 'Ημιαυτόματο marksman · .308 Winchester',
  'catalog.mk14.detail':
    'Το Mk14 Marksman είναι όπλο μάχης αερίου κομμένο σε ρόλο DMR. Κάννη 22 ιντσών και αέριο κόβουν την ακρίβεια έναντι κλείστρου — περίπου 0.65 MOA μηχανικά — αλλά ο κύκλος είναι κάτω από το δευτερόλεπτο. Αυτή είναι η ανταλλαγή: χάνεις γωνία σε κρύα πλάκα και την παίρνεις πίσω όταν το στάδιο θέλει δύο χτυπήματα πριν τελειώσει ο χρόνος. Ψηλότερη γραμμή σκόπευσης και λιγότερη μάζα σημαίνουν περισσότερη ανύψωση στομίου. Μεταχειρίσου το ως μηχανή follow-up, όχι ως όπλο μιας τρύπας.',
  'catalog.mk14.note.0':
    'Ημιαυτόματος κύκλος (~0.55 s) κυριαρχεί σε στάδια με πολλές πλάκες σε παρόμοια απόσταση.',
  'catalog.mk14.note.1':
    'Περίμενε περισσότερη διασπορά από τα κλείστρα· μην κατηγορείς τον άνεμο για χαλαρή ομάδα.',
  'catalog.mk14.note.2':
    'Ίδια θαλάμωση .308 με το Ranger — τα πυρομαχικά είναι εναλλάξιμα μόλις τα έχεις.',
  'catalog.prs26.name': 'Sabre PRS',
  'catalog.prs26.blurb':
    'Σασί για αγώνες. Αρκετά βαρύ ώστε να κάθεται μόνο του.',
  'catalog.prs26.role': 'Κλείστρο αγώνων chassis · 6.5 Creedmoor',
  'catalog.prs26.detail':
    'Το Sabre PRS είναι φτιαγμένο για στάδια PRS: άκαμπτο σασί, κάννη 26 ιντσών με περιστροφή 8 ιντσών, και αρκετή μάζα ώστε τα σταυρωνικά μόλις να νιώθουν τον σφυγμό. Στο 6.5 Creedmoor στέλνει υψηλού BC match βλήματα με επίπεδη τροχιά και ήπια ανάκρουση για την ταχύτητα. Η ράγα 8.7 mil αγοράζει ύψος για το μακρινό άκρο της κάρτας χωρίς να τελειώνει ο πυργίσκος. Είναι το πρώτο όπλο στη σχάρα που νιώθει σχεδιασμένο γύρω από data card, όχι από πάγκο κυνηγιού.',
  'catalog.prs26.note.0':
    'Γρήγορη 1:8 ιδανική για 140–147 gr ELD.',
  'catalog.prs26.note.1':
    'Βαρύ σασί (~7.9 kg) κόβει το τρέμουλο· η στήριξη μετράει ακόμα σε ασταθείς βολές.',
  'catalog.prs26.note.2':
    'Ακρίβεια ~0.22 MOA μηχανικά — συνήθως τα πυρομαχικά ανοίγουν περισσότερο τον κώνο.',
  'catalog.aw300.name': 'Arctic AW300',
  'catalog.aw300.blurb':
    'Μάγκνουμ για κρύο. Τιμωρεί τις γρήγορες βολές· βάναυσα επίπεδο όταν δεν βιάζεσαι.',
  'catalog.aw300.role': 'Μάγκνουμ κρύου καιρού · .300 Winchester Magnum',
  'catalog.aw300.detail':
    'Το Arctic AW300 είναι μάγκνουμ για δύσκολο καιρό και δύσκολες αποστάσεις. Το .300 WM φεύγει γρήγορα, μένει επίπεδο στις μεσαίες, και φτάνει ακόμα με δύναμη όταν το .308 έχει μαλακώσει. Το τίμημα είναι ανάκρουση και αργή ανάκαμψη: ο κύκλος περνάει τα δύο δευτερόλεπτα αν τον κάνεις σωστά, και μια βιαστική δεύτερη βολή πάει ψηλά και δεξιά. Γεωμετρία κοντακίου για κρύο και κάννη 26 ιντσών είναι ειλικρινή εργαλεία για υψόμετρο και καταιγίδα, όπου η πυκνότητα αέρα αλλάζει το dope περισσότερο απ’ όσο θέλει ο εγωισμός σου.',
  'catalog.aw300.note.0':
    'Ανάκρουση μάγκνουμ — φρένο ή σιγαστήρας αν σε νοιάζει η δεύτερη βολή.',
  'catalog.aw300.note.1':
    'Ταιριάζει με 190–215 gr match για τέντωμα πέρα από 1000 m.',
  'catalog.aw300.note.2':
    'Αργός κύκλος ανταμείβει μία προσεκτική βολή· γρήγορα στάδια πολλών πλακών προτιμούν ελαφρύτερα διαμετρήματα.',
  'catalog.lr338.name': 'Vanguard LR338',
  'catalog.lr338.blurb':
    'Εδώ αρχίζει το μίλι. Είκοσι ίντσες ράγας και ανάκρουση που τη νιώθεις στα δόντια.',
  'catalog.lr338.role': 'Κλείστρο μεγάλου βεληνεκούς · .338 Lapua Magnum',
  'catalog.lr338.detail':
    'Το Vanguard LR338 είναι εκεί που η βολή του μιλίου παύει να είναι φήμη. Κάννη 27 ιντσών, 1:9.5, και 11.6 mil ράγας δίνουν σε βλήμα ~300 gr χώρο να μείνει υπερηχητικό βαθιά στο επόμενο χιλιόμετρο. Μάζα γύρω στα εννέα κιλά· σταθεροποιεί το κράτημα και αφήνει έκρηξη στομίου που τη νιώθεις στα δόντια. Διαδρομή πυργίσκου και κλήση ανέμου μετράνε περισσότερο από «μαγεία» σκανδάλης πέρα από 1200 m — αυτό το όπλο δεν συγχωρεί λάθος πυκνότητα ή τεμπέλικη ζώνη ανέμου.',
  'catalog.lr338.note.0':
    'Ράγα και διαδρομή για πραγματικό long-range· βάλε γυαλί με αρκετό ύψος.',
  'catalog.lr338.note.1':
    'Βαρύ μάγκνουμ: δίποδο ή τρίποδο σχεδόν υποχρεωτικό για καθαρές ομάδες.',
  'catalog.lr338.note.2':
    'Χρησιμοποίησε 250–300 gr match· ελαφρύτερα βλήματα σπαταλούν τη θαλάμωση.',
  'catalog.am50.name': 'Hadron AM50',
  'catalog.am50.blurb':
    'Αντιϋλικό. Δεν νοιάζεται για τον άνεμο και ο άνεμος δεν νοιάζεται για σένα.',
  'catalog.am50.role': 'Αντιϋλικό κλείστρο · .50 BMG',
  'catalog.am50.detail':
    'Το Hadron AM50 είναι πρώτα αντιϋλικό και μετά εργαλείο ακριβείας. Δεκατρίαμισι κιλά ατσάλι και σύνθετα, κάννη 29 ιντσών, αργή 1:15 για βαριά .50. Η εκτροπή ανέμου μικραίνει γιατί το βλήμα είναι φορτηγό, αλλά ανάκρουση, έκρηξη και χρόνος κύκλου μεγαλώνουν μαζί του. Η διαηχητική απόσταση μετράται σε χιλιόμετρα, όχι σε εκατοντάδες μέτρα. Λάθος απάντηση για γρήγορη σειρά πλακών· σωστή όταν το πρόβλημα είναι απλώς «πολύ μακριά, πολύ σκληρό, ακόμα όρθιο».',
  'catalog.am50.note.0':
    'Ακραία μάζα και ανάκρουση — περίμενε αργή ανάκαμψη και δυνατή υπογραφή χωρίς can.',
  'catalog.am50.note.1':
    'Αργή περιστροφή για βαριά match και AP, όχι για ελαφρά κυνηγετικά.',
  'catalog.am50.note.2':
    'Ράγα 14.5 mil για βαθύ ύψος· φέρε γυαλί που μπορεί να το χρησιμοποιήσει.',
  'catalog.fieldman4.name': 'Fieldman No.4',
  'catalog.fieldman4.blurb':
    'Πολεμικό κλείστρο με γυαλί. Το κλείστρο γλιστράει· οι ομάδες είναι ειλικρινείς.',
  'catalog.fieldman4.role': 'Κλασικό πολεμικό κλείστρο · .303 British',
  'catalog.fieldman4.detail':
    'Το Fieldman No.4 είναι γυαλισμένο όπλο μάχης από παλαιότερο πόλεμο: ξύλινα έπιπλα, ομαλό κλείστρο και κάννη 25 ιντσών σε .303 British. Ελαφρύτερο και φθηνότερο από τη σύγχρονη σχάρα, με μηχανικό κώνο ειλικρινή παρά αγωνιστικό — περίπου 0.9 MOA πριν τα πυρομαχικά. Η ράγα είναι ρηχή· κρατάς περισσότερο και γυρίζεις λιγότερο πέρα από λίγες εκατοντάδες μέτρα. Διδάσκει άνεμο και hold-off χωρίς ανάκρουση μάγκνουμ.',
  'catalog.fieldman4.note.0':
    'Το surplus .303 είναι πλατύ· τα match 180 gr σφίγγουν τον κώνο αν τα αντέχεις.',
  'catalog.fieldman4.note.1':
    'Χαμηλή ράγα (~1.5 mil) — περίμενε κρατήματα αντί για βαθιά διαδρομή πυργίσκου.',
  'catalog.fieldman4.note.2':
    'Ελαφριά μάζα (~5.2 kg) σημαίνει περισσότερο τρέμουλο αν δεν καθίσεις σωστά το δίποδο.',
  'catalog.trailhand260.name': 'Trailhand 260',
  'catalog.trailhand260.blurb':
    'Κυνηγετικό σασί με τρόπους. Κινείται όταν αναπνέεις και μένει όταν δεν αναπνέεις.',
  'catalog.trailhand260.role': 'Ελαφρύ ορεινό κλείστρο · .260 Remington',
  'catalog.trailhand260.detail':
    'Το Trailhand 260 είναι ελαφρύ κλείστρο ακριβείας για ορεινό έδαφος και μεγάλες διαδρομές μέχρι τη θέση βολής. Στο .260 Remington με κάννη 24 ιντσών 1:8 στέλνει βλήματα οικογένειας 6.5 με ήπια ανάκρουση και γρήγορο κύκλο short-action. Μάζα γύρω στα πέντε κιλά — πιο φιλικό από PRS chassis, λιγότερο συγχωρητικό όταν χτυπάει ο σφυγμός. Ανταμείβει δίποδο και μαξιλάρι: καθάρισε το set-up και ομαδοποιεί σαν σχολικό· βιάσου το κράτημα και τα σταυρωνικά περπατάνε.',
  'catalog.trailhand260.note.0':
    'Ταιριάζει με 130–140 gr .260· ίδια οικογένεια βλημάτων με 6.5, διαφορετική θήκη.',
  'catalog.trailhand260.note.1':
    'Ελαφριά μάζα μεγεθύνει αναπνοή και σφυγμό — ο χρόνος set-up δίποδου δεν είναι προαιρετικός.',
  'catalog.trailhand260.note.2':
    'Γρηγορότερος κύκλος (~1.6 s) από τα μάγκνουμ χωρίς να χάσεις ακρίβεια κλείστρου.',
  'catalog.qmarc.name': 'Quartermaster ARC',
  'catalog.qmarc.blurb':
    'Αερίου που έμαθε να ομαδοποιεί. Οι δεύτερες βολές είναι δωρεάν· οι πρώτες ακόμα κοστίζουν προσοχή.',
  'catalog.qmarc.role': 'Σύγχρονο DMR αερίου · 6mm ARC',
  'catalog.qmarc.detail':
    'Το Quartermaster ARC είναι DMR αερίου με σύγχρονη βαλλιστική. Κάννη 20 ιντσών και 1:7.5 σπρώχνουν υψηλού BC 6mm με λιγότερο άνεμο από το .308 του Mk14, ενώ ο ημιαυτόματος κύκλος μένει κοντά στο μισό δευτερόλεπτο. Η μηχανική ακρίβεια μένει πίσω από κλείστρο — περίπου μισό MOA — αλλά η δεύτερη πλάκα σε χρονισμένη σειρά είναι εκεί που αξίζει. Ηπιότερη ανάκρουση από gas .308 κρατάει τα σταυρωνικά πιο κοντά στο επόμενο κράτημα.',
  'catalog.qmarc.note.0':
    'Ημιαυτόματος κύκλος (~0.5 s) για πολλές πλάκες χωρίς τον άνεμο .308 του Mk14.',
  'catalog.qmarc.note.1':
    'Τα match 6mm ARC είναι επίπεδα και μαλακά· hunting/surplus ανοίγουν την ομάδα.',
  'catalog.qmarc.note.2':
    'Ίδιος ρόλος με Mk14, διαφορετική θαλάμωση — όχι συμβατό πυρομαχικό με .308.',
  'catalog.northlineprc.name': 'Northline PRC',
  'catalog.northlineprc.blurb':
    'Μάγκνουμ φτιαγμένο για την κάρτα, όχι για τον μύθο. Αρκετά επίπεδο για εμπιστοσύνη· αρκετά βαρύ για σοβαρότητα.',
  'catalog.northlineprc.role': 'Σύγχρονο μάγκνουμ chassis · .300 PRC',
  'catalog.northlineprc.detail':
    'Το Northline PRC είναι μάγκνουμ γύρω από data card, όχι νοσταλγία. Το .300 PRC ταΐζει βαριά .30 αποτελεσματικά: υψηλό BC, λογική πυρίτιδα, πιο επίπεδη διαδρομή από το κλασικό .300 WM στην ίδια τάξη βλήματος. Κάννη 26 ιντσών 1:8.5 και 11.6 mil ράγας δίνουν χώρο για πραγματικό long-range χωρίς να πηδήξεις κατευθείαν σε ανάκρουση .338. Ο κύκλος μένει προσεκτικός· η ανάκαμψη είναι πιο ήπια από το Arctic AW300 αν βάλεις φρένο.',
  'catalog.northlineprc.note.0':
    '212–225 gr match είναι ο λόγος της θαλάμωσης — ελαφρά βλήματα τη σπαταλούν.',
  'catalog.northlineprc.note.1':
    'Βαθιά ράγα για μακρινό dope· βάλε FFP γυαλί με αρκετή διαδρομή.',
  'catalog.northlineprc.note.2':
    'Λίγο γρηγορότερος κύκλος από AW300· ακόμα όχι παιχνίδι για στάδια ταχύτητας.',
  'catalog.sentineltrg.name': 'Sentinel TRG',
  'catalog.sentineltrg.blurb':
    'Φτιαγμένο για χιόνι και μεγάλες αναμονές. Το κλείστρο τρέχει ήσυχα· ο άνεμος όχι.',
  'catalog.sentineltrg.role': 'Κλείστρο .338 κρύου καιρού · .338 Lapua Magnum',
  'catalog.sentineltrg.detail':
    'Το Sentinel TRG είναι ο άλλος τρόπος να έχεις μίλι σε .338 Lapua Magnum. Ίδια θαλάμωση με το Vanguard, διαφορετική προσωπικότητα: λίγο ελαφρύτερο, πιο ομαλός κύκλος 2.2 s, γεωμετρία για μεγάλες αναμονές σε κακό καιρό. Ακρίβεια κοντά στο 0.3 MOA μηχανικά — μια τρίχα πίσω από τις καλές μέρες του Vanguard, αλλά το κράτημα συχνά νιώθει πιο ήσυχο μόλις καθίσει το δίποδο. Δεν αγοράζεις νέα βαλλιστική· αγοράζεις αίσθηση, ισορροπία και υπομονή στο μακρινό άκρο.',
  'catalog.sentineltrg.note.0':
    'Ίδιο απόθεμα .338 LM με το Vanguard μόλις το έχεις.',
  'catalog.sentineltrg.note.1':
    'Λίγο ελαφρύτερο και γρηγορότερο στον κύκλο από LR338 — ακόμα ανάκαμψη μάγκνουμ.',
  'catalog.sentineltrg.note.2':
    'Βαθιά ράγα για μίλι· φέρε γυαλί και πραγματική κλήση ανέμου.',

  // --- catalog: ammo ---
  'catalog.308-m80.name': '7.62 M80 Ball',
  'catalog.308-m80.blurb': 'Πυρομαχικά κιβωτίου. Φθηνά, ασυνεπή και ειλικρινή γι’ αυτό.',
  'catalog.308-168.name': '168 gr HPBT Match',
  'catalog.308-168.blurb': 'Το κλασικό φορτίο των 300 γιάρδων. Διαηχητικό πριν τα 800 m.',
  'catalog.308-175.name': '175 gr SMK Match',
  'catalog.308-175.blurb': 'Αυτό που περίμενε το .308. Υπερηχητικό περίπου μέχρι τα 900 m.',
  'catalog.308-sub.name': '190 gr Subsonic',
  'catalog.308-sub.blurb': 'Ήσυχο, και πέφτει σαν τούβλο. Μόνο μέσα στα 200 m.',
  'catalog.303-174.name': '174 gr Mk VII Surplus',
  'catalog.303-174.blurb': 'Πολεμικό ball. Ειλικρινείς ομάδες αν καλέσεις τον άνεμο και δεχτείς τη διασπορά.',
  'catalog.303-180.name': '180 gr HPBT Match',
  'catalog.303-180.blurb': 'Σύγχρονο match σε παλιά θήκη. Μαλακώνει μετά τα 600 m, αλλά ο κώνος είναι δίκαιος.',
  'catalog.260-130.name': '130 gr AB Hunting',
  'catalog.260-130.blurb': 'Ορεινό φορτίο. Επίπεδο και ήπιο μέσα σε μισό χιλιόμετρο.',
  'catalog.260-140.name': '140 gr ELD Match',
  'catalog.260-140.blurb': 'Βαλλιστική 6.5 σε short action. Creedmoor χωρίς marketing.',
  'catalog.65-130.name': '130 gr AB Hunting',
  'catalog.65-130.blurb': 'Γρήγορο και επίπεδο μέσα στα 600 m. Μετά χάνει τη συζήτηση.',
  'catalog.65-140.name': '140 gr ELD Match',
  'catalog.65-140.blurb': 'Ο λόγος που σταμάτησαν όλοι να τσακώνονται για το 6.5 Creedmoor.',
  'catalog.65-147.name': '147 gr ELD Match',
  'catalog.65-147.blurb': 'Πιο αργό στο στόμιο, ακόμα υπερηχητικό όταν το 140 δεν είναι.',
  'catalog.6arc-108.name': '108 gr ELD Match',
  'catalog.6arc-108.blurb': 'Μικρή θήκη, υψηλό BC για το διαμέτρημα. Ήπια ανάκρουση και επίπεδο μέσο βεληνεκές.',
  'catalog.6arc-103.name': '103 gr ELD-X Hunting',
  'catalog.6arc-103.blurb': 'Γρηγορότερο και λίγο πιο «βρώμικο». Καλό μέχρι 500 m αν κρατάς το dope ειλικρινές.',
  'catalog.300-190.name': '190 gr Match',
  'catalog.300-190.blurb': 'Επίπεδο μέχρι τα 800 m και χτυπάει σαν φορτηγό όταν φτάνει.',
  'catalog.300-215.name': '215 gr Hybrid Match',
  'catalog.300-215.blurb': 'Βαρύ για το διαμέτρημα· σχεδόν αγνοεί πλαγιοάνεμο 10 mph.',
  'catalog.300prc-212.name': '212 gr ELD Match',
  'catalog.300prc-212.blurb': 'Σύγχρονη μάγκνουμ θήκη για βαριά .30. Επίπεδη κάρτα, ακριβό μπρούντζο.',
  'catalog.300prc-225.name': '225 gr Hybrid Match',
  'catalog.300prc-225.blurb': 'Το μακρύ βλήμα. Λιγότερος άνεμος· το μίλι είναι λιγότερο φήμη απ’ ό,τι στο .300 WM.',
  'catalog.338-250.name': '250 gr Scenar',
  'catalog.338-250.blurb': 'Το ελαφρύτερο .338. Πολύ γρήγορο, πολύ δυνατό, πολύ ακριβό.',
  'catalog.338-300.name': '300 gr SMK',
  'catalog.338-300.blurb': 'Υπερηχητικό πέρα από τα 1500 m. Από αυτό φτιάχνεται το μίλι.',
  'catalog.50-750.name': '750 gr A-MAX',
  'catalog.50-750.blurb': 'Υπερηχητικό πέρα από δύο χιλιόμετρα. Χαλάει ώμους.',
  'catalog.50-ap.name': 'Mk 211 AP',
  'catalog.50-ap.blurb': 'Φτιαγμένο για μπλοκ μηχανών, όχι για αγώνες.',

  // --- catalog: optics ---
  'catalog.opt-duplex.name': 'Hunter 3-9x40',
  'catalog.opt-duplex.blurb':
    'Σκοπευτικό κυνηγιού με καπάκια πυργίσκων και απλό σταυρό. Η μέτρηση απόστασης είναι μάντεμα.',
  'catalog.opt-duplex.role': 'Duplex κυνηγιού · 3–9×40 · SFP · MOA',
  'catalog.opt-duplex.detail':
    'Το Hunter 3–9×40 είναι σκοπευτικό κατασκήνωσης με καπάκια και απλό duplex. Δεν υπάρχουν mil σημάδια, ούτε δέντρο, ούτε ειλικρινής κλίμακα απόστασης — η απόσταση είναι εκτίμηση από μέγεθος στόχου και μνήμη. Το γυαλί είναι υπηρεσιακό σε καλό φως και μαλακό στην αχλύ. Είναι δωρεάν και τοποθετημένο για να διδάξει ότι η μεγέθυνση μόνη της δεν κάνει σκοπευτή. Όταν τα στάδια ζητούν holds και dials, θα θέλεις κάτι με πραγματικό ρετικλέ και ανοιχτούς πυργίσκους.',
  'catalog.opt-duplex.note.0':
    'Καπάκια: καλά για σταθερό μηδέν, κακά για ρύθμιση ανέμου μέσα στο στάδιο.',
  'catalog.opt-duplex.note.1':
    'SFP duplex — χωρίς mil/MOA σημάδια για ranging ή holdover.',
  'catalog.opt-duplex.note.2':
    'Χαμηλό glass score: mirage και αχλύς σβήνουν νωρίτερα από match οπτικά.',
  'catalog.opt-mildot.name': 'Vector 4-16x50 FFP',
  'catalog.opt-mildot.blurb':
    'Mil-dot πρώτου εστιακού επιπέδου. Τα σταυρωνικά σημαίνουν το ίδιο σε κάθε μεγέθυνση.',
  'catalog.opt-mildot.role': 'Match mil-dot · 4–16×50 · FFP · MIL',
  'catalog.opt-mildot.detail':
    'Το Vector 4–16×50 βάζει mil-dot στο πρώτο εστιακό επίπεδο ώστε η υποδιαίρεση να μένει σωστή σε κάθε ισχύ. Κλικ 0.1 mil και δεκατέσσερα mil ύψους καλύπτουν το μεγαλύτερο μέρος της ενδιάμεσης πορείας. Το γυαλί είναι σαφές βήμα πάνω από το κυνηγετικό: οι άκρες μένουν χρήσιμες και το mirage αρχίζει να διαβάζεται ως πληροφορία. Είναι το πρώτο οπτικό που σου επιτρέπει ranging με ρετικλέ, hold ανέμου σε mil, και εμπιστοσύνη στους αριθμούς όταν αλλάζεις μεγέθυνση μέσα στο στάδιο.',
  'catalog.opt-mildot.note.0':
    'FFP mil-dot: οι τελείες υποτείνουν τα ίδια mil στα 4× και στα 16×.',
  'catalog.opt-mildot.note.1':
    'Πυργίσκοι MIL ταιριάζουν με το ρετικλέ — dial και hold στην ίδια μονάδα.',
  'catalog.opt-mildot.note.2':
    'Στέρεο all-rounder για στάδια ανέμου πριν χρειαστείς πλέγμα «δέντρου».',
  'catalog.opt-sfp.name': 'Meridian 6-24x50 SFP',
  'catalog.opt-sfp.blurb':
    'Φωτεινό, φθηνό για τη μεγέθυνση, και τα σταυρωνικά λένε την αλήθεια μόνο στα 24x.',
  'catalog.opt-sfp.role': 'Υψηλή μεγέθυνση SFP · 6–24×50 · MOA',
  'catalog.opt-sfp.detail':
    'Το Meridian 6–24×50 αγοράζει φωτεινότητα και ισχύ στην κορυφή με μεσαία τιμή κρατώντας το ρετικλέ στο δεύτερο εστιακό επίπεδο. Το mil-dot είναι σωστό μόνο στα 24×· σε οποιαδήποτε άλλη ρύθμιση το ίδιο «ένα mil» είναι λάθος κατά τον λόγο μεγέθυνσης. Όποιος ξεχνάει και μετράει στα 12× θα είναι σχεδόν 50% λάθος στην απόσταση. Όταν χρησιμοποιείται σωστά — true-at-mag για ranging, ή καθαρό dial με γνωστή απόσταση — είναι φωτεινό, ικανό οπτικό με γενναιόδωρη διαδρομή.',
  'catalog.opt-sfp.note.0':
    'Παγίδα SFP: το ρετικλέ είναι ειλικρινές μόνο στα 24×. Σήμανέ το, αλλιώς θα μετρήσεις λάθος.',
  'catalog.opt-sfp.note.1':
    'Πυργίσκοι MOA με ¼ MOA κλικ — μετέτρεψε προσεκτικά αν το dope σου είναι σε mil.',
  'catalog.opt-sfp.note.2':
    'Καλύτερο γυαλί από το Vector· ακόμα όχι κλάσης Ardent για βαθύ mirage.',
  'catalog.opt-tree.name': 'Ardent 5-25x56 FFP',
  'catalog.opt-tree.blurb':
    'Ρετικλέ «χριστουγεννιάτικο δέντρο» και 26 mil διαδρομής. Κράτα τη διόρθωση χωρίς πυργίσκους.',
  'catalog.opt-tree.role': 'Christmas-tree FFP · 5–25×56 · MIL',
  'catalog.opt-tree.detail':
    'Το Ardent 5–25×56 είναι σύγχρονο precision οπτικό: FFP christmas-tree, κλικ 0.1 mil, και 26 mil ύψους ώστε να κρατάς άνεμο και πτώση χωρίς να γυρνάς πυργίσκους υπό πίεση χρόνου. Ο αντικειμενικός 56 mm και υψηλό glass score κρατούν την εικόνα αναγνώσιμη όταν το έδαφος αρχίζει να βράζει. Τα σημεία hold του δέντρου μετατρέπουν καλή κλήση ανέμου σε γρήγορη δεύτερη βολή. Βάρος πάνω από ένα κιλό — το όπλο θα το νιώσει σε ασταθή κράτημα.',
  'catalog.opt-tree.note.0':
    'Tree reticle: holds ανέμου και πτώσης χωρίς να φύγεις από το γυαλί.',
  'catalog.opt-tree.note.1':
    '26 MIL πάνω καλύπτει dope μάγκνουμ βαθιά σε long-range στάδια.',
  'catalog.opt-tree.note.2':
    'FFP σε κάθε ισχύ — ζουμ για καθαρότητα, όχι για μαθηματικά ρετικλέ.',
  'catalog.opt-elite.name': 'Ardent 7-35x56 FFP',
  'catalog.opt-elite.blurb':
    'Τριάντα πέντε φορές. Σε αυτή τη μεγέθυνση το mirage γίνεται ανεμοδείκτης.',
  'catalog.opt-elite.role': 'Elite long-range FFP · 7–35×56 · MIL',
  'catalog.opt-elite.detail':
    'Το Ardent 7–35×56 είναι η κορυφή της σχάρας: τριάντα πέντε φορές, πλήρης διαύγεια, τριάντα δύο mil διαδρομής, και tree αρκετά λεπτό για κλασματικό άνεμο στο μίλι. Σε αυτή τη μεγέθυνση το mirage δεν είναι θόρυβος — είναι ανεμοδείκτης αν ξέρεις να το διαβάζεις. Το οπτικό πεδίο στο χαμηλό άκρο είναι στενό· στοχεύεις με δεδομένα, όχι με πλατιά αναζήτηση. Βαρύ, ακριβό, και ασυγχώρητο σε βρώμικο objective ή κακό μηδέν.',
  'catalog.opt-elite.note.0':
    '35× μετατρέπει το mirage σε αναγνώσιμα στρώματα ανέμου όταν το γυαλί είναι καθαρό.',
  'catalog.opt-elite.note.1':
    '32 MIL ύψος για τροχιές .338 / .50.',
  'catalog.opt-elite.note.2':
    'Στενό FOV σε υψηλή ισχύ — βρες τον στόχο στα 7–12×, μετά ζουμ για τη βολή.',

  // --- catalog: muzzle ---
  'catalog.muz-none.name': 'Γυμνό στόμιο',
  'catalog.muz-none.blurb': 'Σπείρωμα και προστατευτικό. Τίποτα ανάμεσα σε σένα και την έκρηξη.',
  'catalog.muz-none.role': 'Γυμνό σπείρωμα · μόνο προστατευτικό',
  'catalog.muz-none.detail':
    'Τίποτα στις σπείρες εκτός από προστατευτικό. Πλήρης κρότος, πλήρης φλας, και όση σκόνη σηκώνει η έκρηξη από το berm. Ανάκρουση και ταχύτητα ακριβώς ό,τι δίνουν φυσίγγιο και κάννη — χωρίς δωρεάν γεύμα, χωρίς επιπλέον μάζα στο άκρο του σωλήνα. Χρήσιμο όταν θέλεις ειλικρινή υπογραφή για προπόνηση, ή όταν κάθε γραμμάριο στο στόμιο θα αναστάτωνε ρυθμισμένη κάννη. Οι περισσότεροι περνούν σε φρένο ή can όταν τα στάδια τιμωρούν χρόνο ανάκαμψης ή αποκαλύπτουν τη θέση σου.',
  'catalog.muz-none.note.0':
    'Βασική ανάκρουση, ταχύτητα και διασπορά για τα μαθηματικά του loadout.',
  'catalog.muz-none.note.1':
    'Δυνατό και φωτεινό — εύκολο για spotter (ή την πορεία) να σε εντοπίσει.',
  'catalog.muz-none.note.2':
    'Μηδενική μάζα: καμία αλλαγή αρμονικών κάννης από συσκευή.',
  'catalog.muz-brake.name': 'Φρένο Terminator',
  'catalog.muz-brake.blurb':
    'Κόβει σχεδόν στο μισό την ανάκρουση και σηκώνει σύννεφο σκόνης που δείχνει πού είσαι.',
  'catalog.muz-brake.role': 'Φρένο αντιστάθμισης στομίου',
  'catalog.muz-brake.detail':
    'Το Terminator Brake εξαερίζει αέρια πλάγια και πάνω για να κόψει σχεδόν στο μισό την αισθητή ανάκρουση. Τα σταυρωνικά ησυχάζουν πιο γρήγορα — αυτό μετράει σε follow-up μάγκνουμ. Το κόστος είναι υπογραφή: περισσότερη σκόνη, περισσότερο φλας, και κρότος πιο δυνατός για εσένα και όποιον είναι δίπλα στη γραμμή. Η ακρίβεια χάνει λίγο από τη βία των αερίων στο στόμιο. Βάλ’ το όταν η ανάκαμψη μετράει περισσότερο από το να μείνεις αόρατος.',
  'catalog.muz-brake.note.0':
    'Παράγοντας ανάκρουσης ~55% — μεγάλο κέρδος σε follow-up .300 / .338 / .50.',
  'catalog.muz-brake.note.1':
    'Υπογραφή και κρότος ανεβαίνουν· περίμενε σύννεφα σκόνης σε στεγνό έδαφος.',
  'catalog.muz-brake.note.2':
    'Μικρή ποινή διασποράς από τυρβώδη αέρια εξόδου.',
  'catalog.muz-can.name': 'Σιγαστήρας Hushmark',
  'catalog.muz-can.blurb':
    'Ήσυχος, χωρίς σκόνη, λίγη επιπλέον ταχύτητα και πολύ βάρος στην κάννη.',
  'catalog.muz-can.role': 'Πλήρης σιγαστήρας',
  'catalog.muz-can.detail':
    'Ο Hushmark παγιδεύει και ψύχει αέρια πριν φύγουν. Ο κρότος πέφτει απότομα, το φλας σχεδόν εξαφανίζεται, και η υπογραφή σκόνης που προδίδει το φρένο σχεδόν χάνεται. Λίγη δωρεάν ταχύτητα από τον επιπλέον χρόνο παραμονής είναι συνηθισμένη· το ίδιο και πολλή μάζα στο στόμιο, που επιβραδύνει μεταβάσεις και μπορεί να μετατοπίσει το σημείο κρούσης μέχρι να ξαναμηδενίσεις. Για προπόνηση και στάδια «στελθ» είναι η καθαρότερη επιλογή στομίου αν αντέχεις το βάρος και τα credits.',
  'catalog.muz-can.note.0':
    'Χαμηλή υπογραφή και κρότος — δυσκολότερο να εντοπιστεί το σημείο βολής.',
  'catalog.muz-can.note.1':
    'Μικρό κέρδος MV (~+35 fps) και ήπιο κόστος διασποράς.',
  'catalog.muz-can.note.2':
    'Βαρύς (~0.62 kg): επηρεάζει κράτημα και μπορεί να χρειαστεί φρέσκο μηδέν μετά την τοποθέτηση.',
  'catalog.muz-tuner.name': 'Αρμονικός ρυθμιστής',
  'catalog.muz-tuner.blurb':
    'Βάρος στο στόμιο που ησυχάζει το μαστίγωμα της κάννης. Καθαρή ακρίβεια, τίποτα άλλο.',
  'catalog.muz-tuner.role': 'Αρμονικός ρυθμιστής στομίου',
  'catalog.muz-tuner.detail':
    'Ο Harmonic Tuner είναι βάρος ακριβείας, όχι συσκευή έκρηξης. Μετατοπίζοντας το timing του μαστιγώματος της κάννης μπορεί να σφίξει ομάδες κατά μερικά εκατοστά του MOA όταν το φορτίο αγαπάει τον κόμβο. Ανάκρουση και κρότος μένουν ουσιαστικά γυμνού στομίου· η ταχύτητα μπορεί να πέσει λίγο από την επιπλέον μάζα στο άκρο. Δεν υπάρχει δωρεάν σίγαση ούτε δωρεάν ανάκαμψη — μόνο πιο ήσυχη κάννη στο πεδίο συχνοτήτων. Αγωνιστικοί σκοπευτές το βάζουν όταν το όπλο είναι ήδη τακτοποιημένο και το τελευταίο κλάσμα μεγέθους ομάδας είναι ο στόχος.',
  'catalog.muz-tuner.note.0':
    'Η βελτίωση διασποράς είναι όλο το νόημα· η ανάκρουση μένει κοντά στο 100%.',
  'catalog.muz-tuner.note.1':
    'Πιθανή μικρή απώλεια MV· επιβεβαίωσε με χρονογράφο αν dial-άρεις σφιχτό dope.',
  'catalog.muz-tuner.note.2':
    'Ελαφριά συσκευή — μικρότερη ποινή κρατήματος από πλήρες can.',

  // --- catalog: support ---
  'catalog.sup-none.name': 'Χωρίς στήριξη',
  'catalog.sup-none.blurb': 'Αγκώνες και ελπίδα.',
  'catalog.sup-bag.name': 'Οπίσθιο μαξιλάρι',
  'catalog.sup-bag.blurb': 'Βγάζει το κάθετο από το κράτημα με κόστος ενός σάντουιτς.',
  'catalog.sup-bipod.name': 'Δίποδο Recon',
  'catalog.sup-bipod.blurb':
    'Σωστά φορτωμένο σκοτώνει το μεγαλύτερο μέρος του τρεμούλιασματος και όλη την κινητικότητα.',
  'catalog.sup-tripod.name': 'Τρίποδο ballhead',
  'catalog.sup-tripod.blurb': 'Το πιο σταθερό πράγμα για βολή. Αργεί αιώνια να ισοπεδωθεί.',

  // --- catalog: gear ---
  'catalog.gear-lrf.name': 'Αποστασιόμετρο λέιζερ',
  'catalog.gear-lrf.blurb':
    'Σου δίνει την απόσταση στο μέτρο. Χωρίς αυτό μετράς σε mil και κάνεις αριθμητική.',
  'catalog.gear-kestrel.name': 'Μετεωρόμετρο',
  'catalog.gear-kestrel.blurb':
    'Διαβάζει θερμοκρασία, πίεση, υγρασία και τον άνεμο ακριβώς στο σημείο βολής.',
  'catalog.gear-solver.name': 'Βαλλιστικός υπολογιστής',
  'catalog.gear-solver.blurb':
    'Μετατρέπει όποιους αριθμούς του δώσεις σε ρύθμιση και κράτημα. Σκουπίδια μέσα, άστοχο έξω.',
  'catalog.gear-level.name': 'Επίπεδο αντι-κλίσης',
  'catalog.gear-level.blurb':
    'Φυσαλίδα κάτω στην εικόνα του σκοπευτικού. Χωρίς αυτή δεν βλέπεις ότι είσαι γερμένος.',
  'catalog.gear-spotter.name': 'Κιάλι παρατήρησης',
  'catalog.gear-spotter.blurb':
    'Δείχνει το splash του άστοχου αρκετά καθαρά για να διορθώσεις αντί να μαντεύεις.',
  'catalog.gear-chrono.name': 'Χρονογράφος στομίου',
  'catalog.gear-chrono.blurb':
    'Λέει τι κάνει πραγματικά η κάννη σήμερα, όχι τι έγραφε το κουτί.',
  'catalog.gear-traj.name': 'Καταγραφέας τροχιάς',
  'catalog.gear-traj.blurb':
    'Πλευρική όψη της βολής που μόλις ρίχτηκε. Πάτα την καμπύλη για απόσταση, ύψος και ταχύτητα.',

  // --- glossary ---
  'glossary.title': 'ΓΛΩΣΣΑΡΙ',
  'glossary.intro': 'Όροι που θα συναντήσεις στο πεδίο και σε αυτόν τον προπονητή.',
  'glossary.mil.term': 'Mil (μιλιραντάν)',
  'glossary.mil.def':
    'Γωνιακή μονάδα. Ένα mil ≈ 10 cm στα 100 m (ή 1 m στα 1000 m). Σταυρωνικά, holds και πυργίσκοι εδώ χρησιμοποιούν mils.',
  'glossary.moa.term': 'MOA (λεπτό γωνίας)',
  'glossary.moa.def':
    'Άλλη γωνιακή μονάδα: περίπου 1 ίντσα στα 100 γιάρδες. Μερικά πραγματικά σκοπευτικά κάνουν κλικ σε MOA· εδώ μιλάμε κυρίως σε mils.',
  'glossary.dope.term': 'DOPE / κάρτα δεδομένων',
  'glossary.dope.def':
    'Data On Previous Engagements — αριθμοί ύψους και ανέμου για το φορτίο σου ανά απόσταση. Για τυπικό αέρα· διορθώνεις για τη μέρα.',
  'glossary.zero.term': 'Μηδενισμός (zero)',
  'glossary.zero.def':
    'Η απόσταση όπου η σφαίρα τέμνει τη γραμμή σκόπευσης με τους πυργίσκους στο μηχανικό μηδέν. Κάθε ρύθμιση είναι σχετική με αυτό.',
  'glossary.cold_bore.term': 'Cold bore',
  'glossary.cold_bore.def':
    'Η πρώτη βολή από κρύα κάννη. Πολλά όπλα ρίχνουν εκείνη τη βολή λίγο ψηλότερα ή χαμηλότερα από μια ζεστή ομάδα.',
  'glossary.elevation.term': 'Ύψος (elevation)',
  'glossary.elevation.def':
    'Πάνω/κάτω στον πυργίσκο (ή hold) για πτώση βολίδας. Θετικό ύψος = «πάνω» στη ρύθμιση.',
  'glossary.windage.term': 'Παρέκκλιση (windage)',
  'glossary.windage.def':
    'Αριστερά/δεξιά για άνεμο, spin drift και άλλες πλευρικές επιδράσεις.',
  'glossary.click.term': 'Κλικ',
  'glossary.click.def':
    'Ένα βήμα πυργίσκου. Κάθε κλικ είναι σταθερή γωνία (π.χ. 0,1 mil). Το κουμπί «0» επιστρέφει στον μηχανικό μηδενισμό.',
  'glossary.turret.term': 'Πυργίσκος',
  'glossary.turret.def':
    'Οι ρυθμιστές στο σκοπευτικό για ύψος και παρέκκλιση. Ρύθμισε πριν τη βολή όταν μπορείς· κράτα hold όταν δεν μπορείς.',
  'glossary.hold.term': 'Hold / holdover',
  'glossary.hold.def':
    'Στοχεύεις εκτός κέντρου με τα σταυρωνικά αντί να ρυθμίσεις πυργίσκο. Για άνεμο, κινούμενους, ή όταν τελειώνει η διαδρομή.',
  'glossary.breath.term': 'Κράτημα αναπνοής',
  'glossary.breath.def':
    'Σταματάς την αναπνοή για να ηρεμήσει το σταυρωνικό λίγα δευτερόλεπτα. Πολύ πολύ και χειροτερεύει. Ποντίκι: δεξί· αφή: ΚΡΑΤΑ.',
  'glossary.cant.term': 'Cant (κλίση)',
  'glossary.cant.def':
    'Το όπλο γερμένο αριστερά/δεξιά. Ρίχνει τη βολή πλάγια ακόμα κι αν τα σταυρωνικά είναι πάνω στον στόχο.',
  'glossary.bc.term': 'BC (βαλλιστικός συντελεστής)',
  'glossary.bc.def':
    'Πόσο καλά «γλιστράει» η σφαίρα στον αέρα. Υψηλότερο BC = λιγότερη πτώση και λιγότερος άνεμος, για δεδομένο μοντέλο drag.',
  'glossary.g1_g7.term': 'Μοντέλα drag G1 / G7',
  'glossary.g1_g7.def':
    'Σχήματα αναφοράς όταν δηλώνεται το BC. Σύγχρονες boat-tail σφαίρες συνήθως ταιριάζουν καλύτερα στο G7.',
  'glossary.transonic.term': 'Διαηχητικό (transonic)',
  'glossary.transonic.def':
    'Κοντά στην ταχύτητα του ήχου. Οι ομάδες συχνά ανοίγουν εκεί· η κάρτα δείχνει πού το φορτίο γίνεται διαηχητικό.',
  'glossary.density_altitude.term': 'Ύψος πυκνότητας',
  'glossary.density_altitude.def':
    'Πόσο «πυκνός» φαίνεται ο αέρας για βαλλιστική (ύψος, θερμοκρασία, πίεση, υγρασία). Λεπτός αέρας = λιγότερο drag.',
  'glossary.coriolis.term': 'Coriolis',
  'glossary.coriolis.def':
    'Επίδραση περιστροφής Γης. Στο βόρειο ημισφαίριο οι βολές πάνε ελαφρά δεξιά σε μεγάλο βεληνεκές.',
  'glossary.spin_drift.term': 'Spin drift',
  'glossary.spin_drift.def':
    'Πλευρική μετατόπιση από την περιστροφή της σφαίρας. Μεγαλώνει με τον χρόνο πτήσης.',
  'glossary.traj.term': 'Καταγραφέας τροχιάς',
  'glossary.traj.def':
    'Εξοπλισμός που καταγράφει πλευρική όψη της βολής. Πάτα την καμπύλη για απόσταση, ύψος πάνω από τη γραμμή οπτικού και ταχύτητα βλήματος. Δείχνει την κοντινότερη πλάκα.',
  'glossary.ffp_sfp.term': 'FFP / SFP',
  'glossary.ffp_sfp.def':
    'Πρώτο vs δεύτερο εστιακό επίπεδο. FFP: αληθή mil σε κάθε μεγέθυνση. SFP: αληθή mil μόνο σε μία (συνήθως max).',
  'glossary.first_round.term': 'Ευστοχία πρώτης βολής',
  'glossary.first_round.def':
    'Η πρώτη βολή σε πλάκα πετυχαίνει. Δίνει μπόνους — στο πεδίο σπάνια υπάρχει δωρεάν δεύτερη.',
  'glossary.speed_bonus.term': 'Μπόνους ταχύτητας',
  'glossary.speed_bonus.def':
    'Επιπλέον πόντοι για ευστοχία κοντά στον par χρόνο. Τα hits πληρώνουν περισσότερο· η ταχύτητα ανεβάζει βαθμό. Πλήρες μπόνους στην εξάσκηση.',
  'glossary.frh.term': 'FRH %',
  'glossary.frh.def':
    'Ποσοστό εύστοχων πρώτης βολής — τονίζεται στην κάρτα αποτελεσμάτων επίτηδες.',
  'glossary.par.term': 'Par χρόνος',
  'glossary.par.def':
    'Χρόνος εμπλοκής που θεωρείται «πλήρης ταχύτητα». Πιο αργά χάνει το μπόνους· στην εξάσκηση πληρώνεται πάντα πλήρες.',
  'glossary.qualified.term': 'Επαρκής / βαθμοί',
  'glossary.qualified.def':
    'Βαθμοί από Ανεπαρκής έως Εξαίρετος, με βάση το ποσοστό πόντων επί του μεγίστου του σταδίου.',
  'glossary.unlock.term': 'Όριο ξεκλειδώματος',
  'glossary.unlock.def':
    'Ελάχιστο ποσοστό στο προηγούμενο στάδιο για να ανοίξει το επόμενο. Φαίνεται στις κλειδωμένες κάρτες και στο αποτέλεσμα.',
  'glossary.practice.term': 'Λειτουργία εξάσκησης',
  'glossary.practice.def':
    'Στις ρυθμίσεις: πλήρεις λύσεις, χωρίς λήξη χρόνου, πλήρεις πόντοι ταχύτητας. Σκορ και credits μετράνε.',
  'glossary.free_field.term': 'Ελεύθερο Πεδίο',
  'glossary.free_field.def':
    'Sandbox από το κύριο μενού. Φτιάχνεις τη σειρά: πλήθος/τύπος πλακών, απόσταση, γνωστές ή κρυφές αποστάσεις, καιρός, τοπίο, οποιοδήποτε όπλο/εξοπλισμό. Χωρίς όριο χρόνου — το ρολόι μετρά πάνω. Βαθμολογείται, χωρίς credits και ξεκλειδώματα.',
  'glossary.scenery.term': 'Τοπίο / biome',
  'glossary.scenery.def':
    'Πώς φαίνεται το πεδίο: ανοιχτό, δάσος, έρημος ή αστική ζώνη. Χρωματίζει το έδαφος και τοποθετεί αντικείμενα. Μαλακά (χόρτο, κόμη, σημαίες, πινακίδες, ανεμοδείκτες) κλίνουν και κουνιούνται με τον τοπικό άνεμο — κατεύθυνση και ένταση χωρίς μετρητή.',
  'glossary.rangefinder.term': 'Αποστασιόμετρο',
  'glossary.rangefinder.def':
    'Εξοπλισμός που δίνει πραγματική απόσταση. Χωρίς αυτό μετράς mil και διαιρείς (απόσταση = μέγεθος / mils).',
  'glossary.weather_meter.term': 'Μετεωρόμετρο',
  'glossary.weather_meter.def':
    'Συσκευή τύπου Kestrel με ακριβή αέρα/άνεμο. Χωρίς αυτή η ενημέρωση δίνει στρογγυλεμένη εκτίμηση με πραγματικό σφάλμα.',
  'glossary.solver.term': 'Βαλλιστικός υπολογιστής',
  'glossary.solver.def':
    'Υπολογίζει λύση βολής για τον στόχο κάτω από τα σταυρωνικά. Χωρίς αυτόν διαβάζεις την κάρτα και διορθώνεις μόνος σου.',
  'glossary.spotter.term': 'Σκοπευτικό παρατήρησης / κλήση',
  'glossary.spotter.def':
    'Εξοπλισμός για splash και χρήσιμη διόρθωση. Χωρίς αυτόν μια καθαρή άστοχη μπορεί να χαθεί.',
  'glossary.data_card.term': 'Κάρτα δεδομένων (UI)',
  'glossary.data_card.def':
    'Το εργαλείο ΚΑΡΤΑ και η καρτέλα ενημέρωσης με ύψος/άνεμο ανά απόσταση για το φορτίο σου.',
  'glossary.find_next.term': 'Επόμενος στόχος',
  'glossary.find_next.def':
    'Γυρίζει το όπλο στην επόμενη πλάκα που είναι πάνω. Ευκολία σε μικρούς στόχους· το ρολόι τρέχει κατά τη στροφή.',
  'glossary.credits.term': 'Credits (cr)',
  'glossary.credits.def':
    'Νόμισμα από τις αμοιβές σταδίων. Ξοδεύεται στο οπλοστάσιο για όπλα, πυρομαχικά, γυαλί και εξοπλισμό.',
  'glossary.chrono.term': 'Χρονογράφος στομίου',
  'glossary.chrono.def':
    'Μετρά την πραγματική ταχύτητα εξόδου ανά βολή. Χωρίς αυτό βλέπεις μόνο την ταχύτητα κουτιού στην ενημέρωση. Με αυτό: CHRONO fps στο HUD, ανάγνωση μετά από κάθε βολή, και μέσο / ES / SD στην κάρτα αποτελεσμάτων.',
};
