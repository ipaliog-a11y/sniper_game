import type { Dict } from '../i18n';

export const el: Dict = {
  // --- menu ---
  'menu.title': 'COLD BORE',
  'menu.subtitle': 'Π Ρ Ο Π Ο Ν Η Τ Η Σ   Α Κ Ρ Ι Β Ε Ι Α Σ',
  'menu.stages_cleared': '{cleared} από {total} στάδια   ·   {credits} cr',
  'menu.tutorial': 'ΕΚΠΑΙΔΕΥΣΗ',
  'menu.tutorial_sub': 'τρεις πλάκες, ήρεμος αέρας — σκόπευση, ανάσα, βολή',
  'menu.course': 'ΣΕΙΡΑ ΒΟΛΗΣ',
  'menu.course_sub': '{count} στάδια, από 150 m έως ένα μίλι',
  'menu.armoury': 'ΟΠΛΟΣΤΑΣΙΟ',
  'menu.settings': 'ΡΥΘΜΙΣΕΙΣ',
  'menu.settings_imperial': 'γιάρδες, ίντσες, Φαρενάιτ',
  'menu.settings_metric': 'μέτρα, εκατοστά, Κελσίου',
  'menu.how_it_works': 'ΠΩΣ ΔΟΥΛΕΥΕΙ',
  'menu.footer':
    'Σύρε για σκόπευση, κράτα την αναπνοή, πάτα τη σκανδάλη. Όλα τα υπόλοιπα είναι αριθμητική.',

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
  'settings.sound': 'ΗΧΟΣ',
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
  'settings.reset': 'ΕΠΑΝΑΦΟΡΑ ΠΡΟΟΔΟΥ',
  'settings.reset_confirm': 'ΠΑΤΑ ΞΑΝΑ ΓΙΑ ΟΛΙΚΗ ΔΙΑΓΡΑΦΗ',
  'settings.reset_note': 'εξοπλισμός, credits και κάθε σκορ',
  'settings.erased': 'Η πρόοδος διαγράφηκε',

  // --- stages list ---
  'stages.title': 'ΣΕΙΡΑ ΒΟΛΗΣ',
  'stages.meta': '{targets} στόχοι · έως {range} · {rounds} φυσίγγια · {weather}',
  'stages.locked': 'κλειδωμένο — πέτυχε {pct}% στο προηγούμενο στάδιο',
  'stages.not_shot': 'χωρίς βολή',
  'stages.record': '{pct}%  ·  {pts} πόντοι',

  // --- stage names & briefs ---
  'stage.tutorial.name': '00 — Πρώτες Βολές',
  'stage.tutorial.brief':
    'Τρεις μεγάλες πλάκες σε γνωστές αποστάσεις, ήρεμος αέρας, αρκετός χρόνος. Μάθε σκόπευση, ανάσα και βολή. Τα εύστοχα δίνουν τους περισσότερους πόντους· πρώτη βολή και ταχύτητα είναι μπόνους. Ποντίκι: δεξί = ανάσα, αριστερό ή Space = βολή. Αφή: ΚΡΑΤΑ και ΒΟΛΗ στη μπάρα.',
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
  'brief.the_course': 'Η ΣΕΙΡΑ',
  'brief.gear': 'ΕΞΟΠΛΙΣΜΟΣ',
  'brief.nothing_fitted': 'τίποτα τοποθετημένο',
  'brief.zero': 'ΜΗΔΕΝΙΣΜΟΣ',
  'brief.targets': 'ΣΤΟΧΟΙ',
  'brief.rounds': 'ΦΥΣΙΓΓΙΑ',
  'brief.time_limit': 'ΟΡΙΟ ΧΡΟΝΟΥ',
  'brief.par': 'PAR ΑΝΑ ΣΤΟΧΟ',
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
  'brief.moa_cone': 'κώνος {moa} MOA',
  'brief.mil_travel': '{mils} MIL διαδρομή',
  'brief.transonic_warn':
    'Αυτό το βλήμα γίνεται διαηχητικό στα {range} και οι μακρινοί στόχοι είναι πέρα από εκεί. Περίμενε να ανοίξουν οι ομάδες.',

  // --- armoury ---
  'armoury.title': 'ΟΠΛΟΣΤΑΣΙΟ',
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
  'shoot.find': 'ΕΥΡΕΣΗ',
  'shoot.tool.wind': 'ΑΝΕΜΟΣ',
  'shoot.tool.card': 'ΚΑΡΤΑ',
  'shoot.tool.dial': 'ΠΥΡΓ.',
  'shoot.tool.solve': 'ΛΥΣΗ',
  'shoot.tool.mil': 'MIL',
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
  'result.menu': 'ΚΥΡΙΟ ΜΕΝΟΥ',
  'result.unlock_yes': 'Ξεκλείδωσε: {name}',
  'result.unlock_yes_detail': 'Πέρασες το όριο {pct}% σε αυτό το στάδιο.',
  'result.unlock_no': 'Ακόμα κλειδωμένο: {name}',
  'result.unlock_no_detail': 'Χρειάζεσαι {need}% · έχεις {have}% · λείπουν {pts} πόντοι',
  'result.unlock_final': 'Τέλος σειράς',
  'result.unlock_final_detail': 'Δεν υπάρχει επόμενο στάδιο — κυνηγήσε υψηλότερο βαθμό.',
  'result.tutorial_done': 'Η εκπαίδευση ολοκληρώθηκε',
  'result.tutorial_next': 'Άνοιξε τη Σειρά Βολής όταν είσαι έτοιμος για την πραγματική άσκηση.',
  'result.next_grade': 'Επόμενο: {grade} στο {pct}% · {pts} πόντοι ακόμα',
  'result.top_grade': 'Κορυφαίος βαθμός',
  'result.score_how': 'ΠΩΣ ΧΤΙΣΤΗΚΕ ΤΟ ΣΚΟΡ',
  'result.part_hit': 'ΕΥΣΤΟΧΟ',
  'result.part_first': '1η ΒΟΛΗ',
  'result.part_speed': 'ΤΑΧΥΤΗΤΑ',
  'result.score_legend': 'Τα εύστοχα πληρώνουν περισσότερο · 1η βολή & ταχύτητα είναι μπόνους',

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
  'panel.elevation_travel': 'ΥΨΟΣ  ·  {mils} MIL διαδρομή',
  'panel.windage': 'ΠΑΡΕΚΚΛΙΣΗ',
  'panel.about_range': 'αυτό είναι περίπου {range} στην κάρτα',
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

  // --- catalog: rifles ---
  'catalog.ranger24.name': 'Ranger M24',
  'catalog.ranger24.blurb':
    'Σχολικό όπλο με ξύλινο κοντάκι. Τίποτα δεν εντυπωσιάζει και τίποτα δεν πάει στραβά.',
  'catalog.mk14.name': 'Mk14 Marksman',
  'catalog.mk14.blurb':
    'Αερίου. Μισή ακρίβεια από τα κλείστρα, τετραπλάσια ταχύτητα δεύτερης βολής.',
  'catalog.prs26.name': 'Sabre PRS',
  'catalog.prs26.blurb':
    'Σασί για αγώνες. Αρκετά βαρύ ώστε να κάθεται μόνο του.',
  'catalog.aw300.name': 'Arctic AW300',
  'catalog.aw300.blurb':
    'Μάγκνουμ για κρύο. Τιμωρεί τις γρήγορες βολές· βάναυσα επίπεδο όταν δεν βιάζεσαι.',
  'catalog.lr338.name': 'Vanguard LR338',
  'catalog.lr338.blurb':
    'Εδώ αρχίζει το μίλι. Είκοσι ίντσες ράγας και ανάκρουση που τη νιώθεις στα δόντια.',
  'catalog.am50.name': 'Hadron AM50',
  'catalog.am50.blurb':
    'Αντιϋλικό. Δεν νοιάζεται για τον άνεμο και ο άνεμος δεν νοιάζεται για σένα.',

  // --- catalog: ammo ---
  'catalog.308-m80.name': '7.62 M80 Ball',
  'catalog.308-m80.blurb': 'Πυρομαχικά κιβωτίου. Φθηνά, ασυνεπή και ειλικρινή γι’ αυτό.',
  'catalog.308-168.name': '168 gr HPBT Match',
  'catalog.308-168.blurb': 'Το κλασικό φορτίο των 300 γιάρδων. Διαηχητικό πριν τα 800 m.',
  'catalog.308-175.name': '175 gr SMK Match',
  'catalog.308-175.blurb': 'Αυτό που περίμενε το .308. Υπερηχητικό περίπου μέχρι τα 900 m.',
  'catalog.308-sub.name': '190 gr Subsonic',
  'catalog.308-sub.blurb': 'Ήσυχο, και πέφτει σαν τούβλο. Μόνο μέσα στα 200 m.',
  'catalog.65-130.name': '130 gr AB Hunting',
  'catalog.65-130.blurb': 'Γρήγορο και επίπεδο μέσα στα 600 m. Μετά χάνει τη συζήτηση.',
  'catalog.65-140.name': '140 gr ELD Match',
  'catalog.65-140.blurb': 'Ο λόγος που σταμάτησαν όλοι να τσακώνονται για το 6.5 Creedmoor.',
  'catalog.65-147.name': '147 gr ELD Match',
  'catalog.65-147.blurb': 'Πιο αργό στο στόμιο, ακόμα υπερηχητικό όταν το 140 δεν είναι.',
  'catalog.300-190.name': '190 gr Match',
  'catalog.300-190.blurb': 'Επίπεδο μέχρι τα 800 m και χτυπάει σαν φορτηγό όταν φτάνει.',
  'catalog.300-215.name': '215 gr Hybrid Match',
  'catalog.300-215.blurb': 'Βαρύ για το διαμέτρημα· σχεδόν αγνοεί πλαγιοάνεμο 10 mph.',
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
  'catalog.opt-mildot.name': 'Vector 4-16x50 FFP',
  'catalog.opt-mildot.blurb':
    'Mil-dot πρώτου εστιακού επιπέδου. Τα σταυρωνικά σημαίνουν το ίδιο σε κάθε μεγέθυνση.',
  'catalog.opt-sfp.name': 'Meridian 6-24x50 SFP',
  'catalog.opt-sfp.blurb':
    'Φωτεινό, φθηνό για τη μεγέθυνση, και τα σταυρωνικά λένε την αλήθεια μόνο στα 24x.',
  'catalog.opt-tree.name': 'Ardent 5-25x56 FFP',
  'catalog.opt-tree.blurb':
    'Ρετικλέ «χριστουγεννιάτικο δέντρο» και 26 mil διαδρομής. Κράτα τη διόρθωση χωρίς πυργίσκους.',
  'catalog.opt-elite.name': 'Ardent 7-35x56 FFP',
  'catalog.opt-elite.blurb':
    'Τριάντα πέντε φορές. Σε αυτή τη μεγέθυνση το mirage γίνεται ανεμοδείκτης.',

  // --- catalog: muzzle ---
  'catalog.muz-none.name': 'Γυμνό στόμιο',
  'catalog.muz-none.blurb': 'Σπείρωμα και προστατευτικό. Τίποτα ανάμεσα σε σένα και την έκρηξη.',
  'catalog.muz-brake.name': 'Φρένο Terminator',
  'catalog.muz-brake.blurb':
    'Κόβει σχεδόν στο μισό την ανάκρουση και σηκώνει σύννεφο σκόνης που δείχνει πού είσαι.',
  'catalog.muz-can.name': 'Σιγαστήρας Hushmark',
  'catalog.muz-can.blurb':
    'Ήσυχος, χωρίς σκόνη, λίγη επιπλέον ταχύτητα και πολύ βάρος στην κάννη.',
  'catalog.muz-tuner.name': 'Αρμονικός ρυθμιστής',
  'catalog.muz-tuner.blurb':
    'Βάρος στο στόμιο που ησυχάζει το μαστίγωμα της κάννης. Καθαρή ακρίβεια, τίποτα άλλο.',

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
};
