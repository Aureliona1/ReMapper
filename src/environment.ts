// deno-lint-ignore-file no-explicit-any adjacent-overload-signatures no-namespace
import { combineAnimations, Keyframe, AnimationInternals, TrackValue, Track, toPointDef } from './animation.ts';
import { activeDiffGet } from './beatmap.ts';
import { Vec3, debugWall, copy, rotatePoint } from './general.ts';
import { CustomEvent, CustomEventInternals } from './custom_event.ts';
import { LOOKUP } from './constants.ts';
import { OptimizeSettings } from './anim_optimizer.ts';

let envCount = 0;
let blenderEnvCount = 0;
const trackData: Record<string, any> = {};

const debugData = [
    { _definitePosition: [[0, 1, 0, 0]], _localRotation: [[0, 0, 0, 0]], _scale: [[1, 1, 1, 0]] },
    { _definitePosition: [[4, 1, 0, 0]], _localRotation: [[45, 0, 0, 0]], _scale: [[1, 1, 1, 0]] },
    { _definitePosition: [[0, 5, 0, 0]], _localRotation: [[0, 45, 0, 0]], _scale: [[1, 1, 1, 0]] },
    { _definitePosition: [[0, 1, 4, 0]], _localRotation: [[0, 0, 45, 0]], _scale: [[1, 1, 1, 0]] }
];

export class Environment {
    json: Record<string, any> = {};

    /**
     * Environment object for ease of creation and additional tools.
     * @param {String} id 
     * @param {String} lookupMethod 
     */
    constructor(id?: string, lookupMethod: LOOKUP | undefined = undefined) {
        id ??= "";
        lookupMethod ??= LOOKUP.CONTAINS;
        this.id = id;
        this.lookupMethod = lookupMethod;
    }

    /**
    * Create an environment object using JSON.
    * @param {Object} json 
    * @returns {Environment}
    */
    import(json: Record<string, any>) {
        this.json = json;
        return this;
    }

    /**
     * Push this environment object to the difficulty
     */
    push() {
        if (this.track.value === undefined) this.trackSet = `environment${envCount}`;
        envCount++;
        if (activeDiffGet().environment === undefined) activeDiffGet().environment = [];
        activeDiffGet().environment.push(copy(this));
        return this;
    }

    get id() { return this.json._id }
    get lookupMethod() { return this.json._lookupMethod }
    get duplicate() { return this.json._duplicate }
    get active() { return this.json._active }
    get scale() { return this.json._scale }
    get position() { return this.json._position }
    get localPosition() { return this.json._localPosition }
    get rotation() { return this.json._rotation }
    get localRotation() { return this.json._localRotation }
    get lightID() { return this.json._lightID }
    get track() { return new Track(this.json._track) }
    get group() { return this.json._group }
    get animationProperties() {
        const returnObj: any = {};
        if (this.position !== undefined) returnObj._position = this.position;
        if (this.localPosition !== undefined) returnObj._localPosition = this.localPosition;
        if (this.rotation !== undefined) returnObj._rotation = this.rotation;
        if (this.localRotation !== undefined) returnObj._localRotation = this.localRotation;
        if (this.scale !== undefined) returnObj._scale = this.scale
        return returnObj;
    }

    set id(value: string) { this.json._id = value }
    set lookupMethod(value: LOOKUP) { this.json._lookupMethod = value }
    set duplicate(value: number) { this.json._duplicate = value }
    set active(value: boolean) { this.json._active = value }
    set scale(value: number[]) { this.json._scale = value }
    set position(value: number[]) { this.json._position = value }
    set localPosition(value: number[]) { this.json._localPosition = value }
    set rotation(value: number[]) { this.json._rotation = value }
    set localRotation(value: number[]) { this.json._localRotation = value }
    set lightID(value: number) { this.json._lightID = value }
    set trackSet(value: TrackValue) { this.json._track = value }
    set group(value: string) { this.json._group = value }
}

const blenderShrink = 9 / 10; // For whatever reason.. this needs to be multiplied to all of the scales to make things look proper... who knows man.

export namespace BlenderEnvironmentInternals {
    export class BaseBlenderEnvironment {
        scale: [number, number, number];
        anchor: [number, number, number];

        constructor(scale: Vec3, anchor: Vec3) {
            this.scale = <Vec3>scale.map(x => (1 / x) / 0.6);
            this.anchor = anchor;
        }

        processData(trackData: any[] | string) {
            const outputData: Record<string, any>[] = [];

            if (typeof trackData === "string") trackData = getTrackData(trackData);

            trackData.forEach(x => {
                const data = {
                    rawPos: <number[][]>[],
                    rawScale: <number[][]>[],
                    pos: <number[][]>[],
                    rot: <number[][]>[],
                    scale: <number[][]>[]
                };

                const posData = x._definitePosition;
                const rotData = x._localRotation;
                const scaleData = x._scale;

                let longestArr = [];
                const length = Math.max(posData.length, rotData.length, scaleData.length);
                if (posData.length === length) longestArr = posData;
                if (rotData.length === length) longestArr = rotData;
                if (scaleData.length === length) longestArr = scaleData;

                let posIndex = 0;
                let rotIndex = 0;
                let scaleIndex = 0;

                for (let i = 0; i < length; i++) {
                    let pos = new Keyframe(posData[posIndex]);
                    let rot = new Keyframe(rotData[rotIndex]);
                    let scale = new Keyframe(scaleData[scaleIndex]);
                    const ref = new Keyframe(longestArr[i]);

                    posIndex++;
                    rotIndex++;
                    scaleIndex++;

                    if (pos.time !== ref.time) {
                        posIndex--;
                        pos = new Keyframe(posData[posIndex]);
                    }
                    if (rot.time !== ref.time) {
                        rotIndex--;
                        rot = new Keyframe(rotData[rotIndex]);
                    }
                    else data.rot.push(rot.values);
                    if (scale.time !== ref.time) {
                        scaleIndex--;
                        scale = new Keyframe(scaleData[scaleIndex]);
                    }
                    else {
                        data.rawScale.push([...scale.values.map(y => y * blenderShrink), ref.time]);
                        data.scale.push([...scale.values.map((y, i) => y * this.scale[i] * blenderShrink), ref.time]);
                    }

                    const objPos = pos.values as Vec3;
                    const objRot = rot.values as Vec3;
                    const objScale = scale.values;

                    data.rawPos.push([...objPos, ref.time]);
                    const offset = rotatePoint(objRot, objScale.map((y, i) => y * -this.anchor[i] * blenderShrink) as Vec3);
                    data.pos.push([...objPos.map((y, i) => y + offset[i]), ref.time]);
                }

                outputData.push(data);
            })

            return outputData;
        }
    }

    export class BlenderAssigned extends BaseBlenderEnvironment {
        track: string;
        disappearWhenAbsent: boolean;
        parent: BlenderEnvironment;

        constructor(parent: BlenderEnvironment, scale: Vec3, anchor: Vec3, track: string, disappearWhenAbsent: boolean) {
            super(scale, anchor);
            this.parent = parent;
            this.track = track;
            this.disappearWhenAbsent = disappearWhenAbsent;
        }

        getDataForTrack(dataTrack: string) {
            return this.processData(`${dataTrack}_${this.track}`);
        }

        static(dataTrack: string, forEvents?: (moveEvent: CustomEventInternals.AnimateTrack) => void) {
            const data = this.getDataForTrack(dataTrack);

            if (data.length > 0) {
                const x = data[0];
                const objPos = [x.pos[0][0], x.pos[0][1], x.pos[0][2]];
                const objRot = [x.rot[0][0], x.rot[0][1], x.rot[0][2]];
                const objScale = [x.scale[0][0], x.scale[0][1], x.scale[0][2]];

                const moveEvent = new CustomEvent().animateTrack(this.track);
                moveEvent.animate.position = objPos;
                moveEvent.animate.rotation = objRot;
                moveEvent.animate.scale = objScale;
                if (forEvents !== undefined) forEvents(moveEvent);
                moveEvent.push();
            }
        }

        animate(dataTrack: string, time: number, duration: number, forEvents?: (moveEvent: CustomEventInternals.AnimateTrack) => void) {
            const data = this.getDataForTrack(dataTrack);

            if (data.length > 0) {
                const x = data[0];

                const moveEvent = new CustomEvent(time).animateTrack(this.track);
                moveEvent.animate.position = x.pos;
                moveEvent.animate.rotation = x.rot;
                moveEvent.animate.scale = x.scale;
                if (this.parent.assignedOptimizeSettings) moveEvent.animate.optimize(undefined, this.parent.assignedOptimizeSettings);
                moveEvent.duration = duration;
                if (forEvents !== undefined) forEvents(moveEvent);
                moveEvent.push();
            }
            else if (this.disappearWhenAbsent) {
                const moveEvent = new CustomEvent(time).animateTrack(this.track);
                moveEvent.animate.position = "yeet";
                moveEvent.push();
            }
        }
    }
}

export class BlenderEnvironment extends BlenderEnvironmentInternals.BaseBlenderEnvironment {
    id?: string;
    trackID: number;
    lookupMethod?: LOOKUP;
    assigned: BlenderEnvironmentInternals.BlenderAssigned[] = [];
    objectAmounts: number[][] = [];
    maxObjects = 0;
    optimizeSettings: OptimizeSettings | undefined = new OptimizeSettings();
    assignedOptimizeSettings: OptimizeSettings | undefined = new OptimizeSettings();

    /**
    * Tool for using model data from ScuffedWalls for environments.
    * @param {Array} scale The scale of the object relative to a noodle unit cube.
    * @param {Array} anchor The anchor point of rotation on the object, 1 = length of object on that axis.
    */
    constructor(scale: Vec3, anchor: Vec3, id?: string, lookupMethod?: LOOKUP) {
        super(scale, anchor)
        this.id = id;
        this.lookupMethod = lookupMethod;
        this.trackID = blenderEnvCount;
        blenderEnvCount++;
    }

    /**
     * Assign pre-existing tracks to be animated with this environment. 
     * For example if the current data track is "shore" and you assign an object with track "cloud", there needs to be data for the track "shore_cloud".
     * In your shore model if you set the second material name to shore_cloud, you can move represent the cloud's transform by that object.
     * @param {Array} tracks Can be a single track or array of tracks.
     * @param {Vec3} scale
     * @param {Vec3} anchor
     * @param {Boolean} disappearWhenAbsent Determine whether to make this object disappear when no data for it is present in an environment.
     */
    assignObjects(tracks: string | string[], scale?: Vec3, anchor?: Vec3, disappearWhenAbsent = true) {
        scale ??= [1, 1, 1];
        anchor ??= [0, 0, 0];
        if (typeof tracks === "string") tracks = [tracks];
        tracks.forEach(x => { this.assigned.push(new BlenderEnvironmentInternals.BlenderAssigned(this, scale as Vec3, anchor as Vec3, x, disappearWhenAbsent)) })
    }

    /**
     * Look up the amount of objects active in the environment at a certain beat.
     * You'll want to do this after all of the environment switches (if any), so that the maximum can be properly calculated.
     * @param time 
     */
    lookupAmount(time: number) {
        let result = 0;
        this.objectAmounts.forEach(x => {
            if (time >= x[0]) result = x[1];
        })
        return result;
    }

    /**
     * Set the environment to be static. Should only be used once.
     * @param {String} dataTrack The track ScuffedWalls will output for this model's data.
     * If left undefined, a debug model with debug walls, useful for fitting objects to a cube, will be placed. 
     * @param {Function} forEnv Runs for each environment object.
     * @param {Function} forAssigned Runs for each assigned object moving event.
     */
    static(dataTrack?: string, forEnv?: (envObject: Environment, objects: number) => void, forAssigned?: (moveEvent: CustomEventInternals.AnimateTrack) => void) {
        let data;
        if (dataTrack === undefined) data = this.processData(debugData);
        else data = this.processData(dataTrack);
        let objects = 0;

        data.forEach(x => {
            const pos = [x.pos[0][0], x.pos[0][1], x.pos[0][2]];
            const rot = [x.rot[0][0], x.rot[0][1], x.rot[0][2]];
            const scale = [x.scale[0][0], x.scale[0][1], x.scale[0][2]];

            const envObject = new Environment(this.id, this.lookupMethod);
            envObject.position = pos;
            envObject.rotation = rot;
            envObject.scale = scale;
            envObject.duplicate = 1;

            objects++;

            if (forEnv !== undefined) forEnv(envObject, objects);
            envObject.push();

            if (dataTrack === undefined) debugWall({
                pos: [x.rawPos[0][0], x.rawPos[0][1], x.rawPos[0][2]],
                rot: rot,
                scale: [x.rawScale[0][0], x.rawScale[0][1], x.rawScale[0][2]]
            });
        })

        this.maxObjects = objects;
        this.objectAmounts = [[0, objects]];

        if (dataTrack) this.assigned.forEach(x => { x.static(dataTrack, forAssigned) });
    }

    /**
     * Set the environment to switch to different models at certain times. Also uses model animations.
     * @param {Array} switches First element is the data track of the switch, second element is the time, 
     * third element (optional) is the duration of the animation.
     * fourth element (optional) is a function to run per environment moving event.
     * fifth element (optional) is a function to run per assigned object moving event.
     * @param {Function} forEnvSpawn function to run for each initial environment object.
     */
    animate(switches: [string, number, number?,
        ((moveEvent: CustomEventInternals.AnimateTrack, objects: number) => void)?,
        ((moveEvent: CustomEventInternals.AnimateTrack) => void)?
    ][], forEnvSpawn?: (envObject: Environment) => void) {
        createYeetDef();
        switches.sort((a, b) => a[1] - b[1]);

        switches.forEach(x => {
            const dataTrack = x[0];
            const time = x[1];
            const duration = x[2] ?? 0;
            const forEnv = x[3];
            const forAssigned = x[4];
            const data = this.processData(dataTrack);
            let objects = 0;

            data.forEach((x, i) => {
                const event = new CustomEvent(time).animateTrack(this.getPieceTrack(i), duration);
                event.animate.position = x.pos;
                event.animate.rotation = x.rot;
                event.animate.scale = x.scale;
                if (this.optimizeSettings) event.animate.optimize(undefined, this.optimizeSettings);
                if (forEnv !== undefined) forEnv(event, objects);
                event.push();

                objects++;
            })

            if (objects > this.maxObjects) this.maxObjects = objects;
            this.objectAmounts.push([time, objects]);

            this.assigned.forEach(x => { x.animate(dataTrack, time, duration, forAssigned) });
        })

        switches.forEach(x => {
            const time = x[1];
            const objects = this.lookupAmount(time);
            for (let i = objects; i < this.maxObjects; i++) {
                const event = new CustomEvent(time).animateTrack(this.getPieceTrack(i));
                event.animate.position = "yeet";
                event.push();
            }
        })

        for (let i = 0; i < this.maxObjects; i++) {
            const envObject = new Environment(this.id, this.lookupMethod);
            envObject.position = [0, -69420, 0];
            envObject.duplicate = 1;
            envObject.trackSet = this.getPieceTrack(i);
            if (forEnvSpawn !== undefined) forEnvSpawn(envObject);
            envObject.push();
        }
    }

    /**
     * Get the track for a piece of the environment, if it's been animated.
     * @param {Number} index 
     * @returns {Number}
     */
    getPieceTrack(index: number) {
        return `blenderEnv${this.trackID}_${index}`;
    }
}

/**
 * Animate each environment piece in a given assigned group, with all of their individual transforms combined.
 * @param {String} group 
 * @param {Number} time 
 * @param {Number} duration 
 * @param {Object} animation
 * @param {String} easing 
 */
export function animateEnvGroup(group: string, time: number, duration: number, animation: AnimationInternals.BaseAnimation, easing?: string) {
    if (activeDiffGet().environment !== undefined) activeDiffGet().environment.forEach(x => {
        if (x.group === group) {
            const newAnimation = copy(animation.json);

            Object.keys(newAnimation).forEach(key => {
                if (x.json[key]) newAnimation[key] = combineAnimations(newAnimation[key], x.json[key], key);
            })

            new CustomEvent(time).animateTrack(x.track.value as string, duration, newAnimation, easing).push();
        }
    })
}

/**
 * Animate an environment piece with a track, with all of it's initial transforms combined.
 * @param {String} group 
 * @param {Number} time 
 * @param {Number} duration 
 * @param {Object} animation
 * @param {String} easing 
 */
export function animateEnvTrack(track: string, time: number, duration: number, animation: AnimationInternals.BaseAnimation, easing?: string) {
    if (activeDiffGet().environment !== undefined) activeDiffGet().environment.forEach(x => {
        if (x.track.has(track)) {
            const newAnimation = copy(animation.json);

            Object.keys(newAnimation).forEach(key => {
                if (x.json[key]) newAnimation[key] = combineAnimations(newAnimation[key], x.json[key], key);
            })

            new CustomEvent(time).animateTrack(track, duration, newAnimation, easing).push();
        }
    })
}

function getTrackData(track: string): any[] {
    if (!trackData[track]) {
        trackData[track] = [];
        for (let i = 0; i < activeDiffGet().notes.length; i++) {
            const note = activeDiffGet().notes[i];
            if (note.track.has(track)) {
                trackData[track].push(note.animation);
                activeDiffGet().notes.splice(i, 1);
                i--;
            }
        }
    }
    return trackData[track];
}

let noYeet = true;

function createYeetDef() {
    if (noYeet === true) {
        noYeet = false;
        toPointDef([0, -69420, 0], "yeet");
    }
}