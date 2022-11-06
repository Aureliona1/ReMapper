// deno-lint-ignore-file adjacent-overload-signatures
import { activeDiffGet, Json } from './beatmap.ts';
import { Animation, AnimationInternals } from './animation.ts';
import { ANCHORMODE, CUT, NOTETYPE } from './constants.ts';
import { BaseGameplayObject, BaseSliderObject } from './object.ts';
import { copy } from './general.ts';

export class Note extends BaseGameplayObject {
    json: Json = {
        b: 0,
        x: 0,
        y: 0,
        c: 0,
        d: 0,
        a: 0,
        customData: {
            animation: {}
        }
    };
    animate = new Animation().noteAnimation(this.animation);

    /**
     * Note object for ease of creation
     */
    constructor(time = 0, type = NOTETYPE.BLUE, direction = CUT.DOWN, x = 0, y = 0) {
        super();
        this.time = time;
        this.type = type;
        this.direction = direction;
        this.x = x;
        this.y = y;
    }

    /**
     * Create a note using JSON.
     * @param {Object} json 
     * @returns {Note}
     */
    import(json: Json) {
        this.json = json;
        if (this.customData === undefined) this.customData = {};
        if (this.animation === undefined) this.animation = {};
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    /**
     * Push this note to the difficulty
     */
    push(fake = false, clone = true) {
        if (fake) activeDiffGet().fakeNotes.push(clone ? copy(this) : this);
        else activeDiffGet().notes.push(clone ? copy(this) : this);
        return this;
    }

    /**
     * Apply an animation through the Animation class.
     * @param {Animation} animation 
     */
    importAnimation(animation: AnimationInternals.BaseAnimation) {
        this.animation = animation.json;
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    get type() { return this.json.c }
    get direction() { return this.json.d }
    get angleOffset() { return this.json.a }
    get flip() { return this.json.customData.flip }
    get noteGravity() { return !this.json.customData.disableNoteGravity }
    get noteLook() { return !this.json.customData.disableNoteLook }
    get spawnEffect() { return this.json.customData.spawnEffect }

    set type(value: NOTETYPE) { this.json.c = value }
    set direction(value: CUT) { this.json.d = value }
    set angleOffset(value: number) { this.json.a = value }
    set flip(value: boolean) { this.json.customData.flip = value }
    set noteGravity(value: boolean) { this.json.customData.disableNoteGravity = !value }
    set noteLook(value: boolean) { this.json.customData.disableNoteLook = !value }
    set spawnEffect(value: boolean) { this.json.customData.spawnEffect = value }
}

export class Bomb extends BaseGameplayObject {
    json: Json = {
        b: 0,
        x: 0,
        y: 0,
        customData: {
            animation: {}
        }
    };
    animate = new Animation().noteAnimation(this.animation);

    /**
    * Bomb object for ease of creation
    */
    constructor(time = 0, x = 0, y = 0) {
        super();
        this.time = time;
        this.x = x;
        this.y = y;
    }

    /**
     * Create a bomb using JSON.
     * @param {Object} json 
     * @returns {Note}
     */
    import(json: Json) {
        this.json = json;
        if (this.customData === undefined) this.customData = {};
        if (this.animation === undefined) this.animation = {};
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    /**
     * Push this bomb to the difficulty
     */
    push(fake = false, clone = true) {
        if (fake) activeDiffGet().fakeBombs.push(clone ? copy(this) : this);
        else activeDiffGet().bombs.push(clone ? copy(this) : this);
        return this;
    }

    /**
     * Apply an animation through the Animation class.
     * @param {Animation} animation 
     */
    importAnimation(animation: AnimationInternals.BaseAnimation) {
        this.animation = animation.json;
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    get flip() { return this.json.customData.flip }
    get noteGravity() { return !this.json.customData.disableNoteGravity }
    get noteLook() { return !this.json.customData.disableNoteLook }
    get spawnEffect() { return this.json.customData.spawnEffect }

    set flip(value: boolean) { this.json.customData.flip = value }
    set noteGravity(value: boolean) { this.json.customData.disableNoteGravity = !value }
    set noteLook(value: boolean) { this.json.customData.disableNoteLook = !value }
    set spawnEffect(value: boolean) { this.json.customData.spawnEffect = value }
}

export class Chain extends BaseSliderObject {
    json: Json = {
        b: 0,
        x: 0,
        y: 0,
        c: 0,
        d: 0,
        tb: 0,
        tx: 0,
        ty: 0,
        sc: 4,
        s: 1,
        customData: {
            animation: {}
        }
    };
    animate = new Animation().noteAnimation(this.animation);

    /**
    * Chain object for ease of creation
    */
    constructor(
        time = 0,
        type = NOTETYPE.BLUE,
        x = 0,
        y = 0,
        tailTime = 0,
        tailX = 0,
        tailY = 0,
        direction = CUT.DOWN,
        links = 4
    ) {
        super();
        this.time = time;
        this.x = x;
        this.y = y;
        this.tailTime = tailTime;
        this.tailX = tailX;
        this.tailY = tailY;
        this.headDirection = direction;
        this.type = type;
        this.links = links;
    }

    /**
     * Create a chain using JSON.
     * @param {Object} json 
     * @returns {Note}
     */
    import(json: Json) {
        this.json = json;
        if (this.customData === undefined) this.customData = {};
        if (this.animation === undefined) this.animation = {};
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    /**
     * Push this chain to the difficulty
     */
    push(fake = false, clone = true) {
        if (fake) activeDiffGet().fakeChains.push(clone ? copy(this) : this);
        else activeDiffGet().chains.push(clone ? copy(this) : this);
        return this;
    }

    /**
     * Apply an animation through the Animation class.
     * @param {Animation} animation 
     */
    importAnimation(animation: AnimationInternals.BaseAnimation) {
        this.animation = animation.json;
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    get links() { return this.json.sc }
    get squish() { return this.json.s }
    get flip() { return this.json.customData.flip }
    get noteGravity() { return !this.json.customData.disableNoteGravity }
    get noteLook() { return !this.json.customData.disableNoteLook }

    set links(value: number) { this.json.sc = value }
    set squish(value: number) { this.json.s = value }
    set flip(value: boolean) { this.json.customData.flip = value }
    set noteGravity(value: boolean) { this.json.customData.disableNoteGravity = !value }
    set noteLook(value: boolean) { this.json.customData.disableNoteLook = !value }
}

export class Arc extends BaseSliderObject {
    json: Json = {
        b: 0,
        c: 0,
        x: 0,
        y: 0,
        d: 0,
        mu: 0,
        tb: 0,
        tx: 0,
        ty: 0,
        tc: 0,
        tmu: 0,
        m: 0,
        customData: {
            animation: {}
        }
    };
    animate = new Animation().noteAnimation(this.animation);

    /**
    * Arc object for ease of creation
    */
    constructor(
        time = 0,
        type = NOTETYPE.BLUE,
        x = 0,
        y = 0,
        headDirection = CUT.DOWN,
        tailTime = 0, tailX = 0,
        tailY = 0,
        tailDirection = CUT.DOWN
    ) {
        super();
        this.time = time;
        this.type = type;
        this.x = x;
        this.y = y;
        this.headDirection = headDirection;
        this.tailTime = tailTime;
        this.tailX = tailX;
        this.tailY = tailY;
        this.tailDirection = tailDirection;
    }

    /**
     * Create an arc using JSON.
     * @param {Object} json 
     * @returns {Note}
     */
    import(json: Json) {
        this.json = json;
        if (this.customData === undefined) this.customData = {};
        if (this.animation === undefined) this.animation = {};
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    /**
     * Push this arc to the difficulty
     */
    push(clone = true) {
        activeDiffGet().arcs.push(clone ? copy(this) : this);
        return this;
    }

    /**
     * Apply an animation through the Animation class.
     * @param {Animation} animation 
     */
    importAnimation(animation: AnimationInternals.BaseAnimation) {
        this.animation = animation.json;
        this.animate = new Animation().noteAnimation(this.animation);
        return this;
    }

    get tailDirection() { return this.json.tc }
    get headLength() { return this.json.mu }
    get tailLength() { return this.json.tmu }
    get anchorMode() { return this.json.m }
    get flip() { return this.json.customData.flip }
    get noteGravity() { return !this.json.customData.disableNoteGravity }

    set tailDirection(value: CUT) { this.json.tc = value }
    set headLength(value: number) { this.json.mu = value }
    set tailLength(value: number) { this.json.tmu = value }
    set anchorMode(value: ANCHORMODE) { this.json.m = value }
    set flip(value: boolean) { this.json.customData.flip = value }
    set noteGravity(value: boolean) { this.json.customData.disableNoteGravity = !value }
}