// deno-lint-ignore-file no-explicit-any adjacent-overload-signatures no-namespace
import { combineAnimations, AnimationInternals, Track, KeyframesLinear, KeyframesVec3 } from './animation.ts';
import { activeDiffGet } from './beatmap.ts';
import { copy, Vec3, ColorType, jsonGet, jsonSet } from './general.ts';
import { CustomEvent } from './custom_event.ts';
import { GEO_TYPE, LOOKUP, GEO_SHADER, ANIM, EASE } from './constants.ts';

let envCount = 0;

export namespace EnvironmentInternals {
    export class BaseEnvironment {
        json: Record<string, any> = {};

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
        push(clone = true) {
            activeDiffGet().rawEnvironment.push(clone ? copy(this) : this);
            return this;
        }

        get duplicate() { return this.json.duplicate }
        get active() { return this.json.active }
        get scale() { return this.json.scale }
        get position() { return this.json.position }
        get localPosition() { return this.json.localPosition }
        get rotation() { return this.json.rotation }
        get localRotation() { return this.json.localRotation }
        get track() { return new Track(this.json) }
        get group() { return this.json.group }
        get animationProperties() {
            const returnObj: {
                position?: KeyframesVec3,
                localPosition?: KeyframesVec3,
                rotation?: KeyframesVec3,
                localRotation?: KeyframesVec3,
                scale?: KeyframesVec3
            } = {};
            if (this.position) returnObj.position = this.position;
            if (this.localPosition) returnObj.localPosition = this.localPosition;
            if (this.rotation) returnObj.rotation = this.rotation;
            if (this.localRotation) returnObj.localRotation = this.localRotation;
            if (this.scale) returnObj.scale = this.scale
            return returnObj;
        }
        get components() { return jsonGet(this.json, "components", {}) }
        get lightID() { return jsonGet(jsonGet(this.components, "ILightWithId", {}), "lightID") }
        get lightType() { return jsonGet(jsonGet(this.components, "ILightWithId", {}), "type") }

        set duplicate(value: number) { this.json.duplicate = value }
        set active(value: boolean) { this.json.active = value }
        set scale(value: Vec3) { this.json.scale = value }
        set position(value: Vec3) { this.json.position = value }
        set localPosition(value: Vec3) { this.json.localPosition = value }
        set rotation(value: Vec3) { this.json.rotation = value }
        set localRotation(value: Vec3) { this.json.localRotation = value }
        set group(value: string) { this.json.group = value }
        set components(value: Components) { this.json.components = value }
        set lightID(value: number) {jsonSet(jsonGet(this.components, "ILightWithId", {}), "lightID", value)}
        set lightType(value: number) {jsonSet(jsonGet(this.components, "ILightWithId", {}), "type", value)}
    }
}

export class Environment extends EnvironmentInternals.BaseEnvironment {
    /**
     * Environment object for ease of creation and additional tools.
     * @param {String} id 
     * @param {String} lookupMethod 
     */
    constructor(id?: string, lookupMethod: LOOKUP | undefined = undefined) {
        super();
        id ??= "";
        lookupMethod ??= "Contains";
        this.id = id;
        this.lookupMethod = lookupMethod;
    }

    get id() { return this.json.id }
    get lookupMethod() { return this.json.lookupMethod }

    set id(value: string) { this.json.id = value }
    set lookupMethod(value: LOOKUP) { this.json.lookupMethod = value }
}

export class Geometry extends EnvironmentInternals.BaseEnvironment {
    json: Record<string, any> = {
        geometry: {}
    };

    constructor(type?: GEO_TYPE, material?: GeometryMaterial | string) {
        super();
        type ??= "Cube";
        material ??= {
            shader: "Standard"
        }
        this.type = type;
        this.material = material;
    }

    get type() { return this.json.geometry.type }
    get material() { return this.json.geometry.material }
    get collision() { return this.json.geometry.collision }

    set type(value: GEO_TYPE) { this.json.geometry.type = value }
    set material(value: GeometryMaterial | string) { this.json.geometry.material = value }
    set collision(value: boolean) { this.json.geometry.collision = value }
}

export type GeometryMaterial = RawGeometryMaterial | string
export type RawGeometryMaterial = {
    shader: GEO_SHADER,
    color?: ColorType,
    track?: string,
    shaderKeywords?: string[]
}

export function animateEnvGroup(group: string, time: number, animation: (animation: AnimationInternals.EnvironmentAnimation) => void, duration?: number, easing?: EASE) {
    if (activeDiffGet().rawEnvironment !== undefined) activeDiffGet().rawEnvironment.forEach(x => {
        if (x.group === group) {
            const newAnimation = new AnimationInternals.AbstractAnimation;
            animation(newAnimation);

            if (!x.track.value) {
                x.track.value = `environment_${envCount}`;
                envCount++
            }

            const event = new CustomEvent(time).animateTrack(x.track.value);
            if (duration) event.duration = duration;
            if (easing) event.easing = easing;

            Object.keys(newAnimation.json).forEach(key => {
                event.animate.json[key] = newAnimation.json[key]
                if (x.json[key]) event.animate.json[key] = combineAnimations(event.animate.json[key], x.json[key], key as ANIM);
            })

            event.push();
        }
    })
}

export function animateEnvTrack(group: string, time: number, animation: (animation: AnimationInternals.EnvironmentAnimation) => void, duration?: number, easing?: EASE) {
    if (activeDiffGet().rawEnvironment !== undefined) activeDiffGet().rawEnvironment.forEach(x => {
        if (x.track.value === group) {
            const newAnimation = new AnimationInternals.AbstractAnimation;
            animation(newAnimation);

            const event = new CustomEvent(time).animateTrack(x.track.value);
            if (duration) event.duration = duration;
            if (easing) event.easing = easing;

            Object.keys(newAnimation.json).forEach(key => {
                event.animate.json[key] = newAnimation.json[key]
                if (x.json[key]) event.animate.json[key] = combineAnimations(event.animate.json[key], x.json[key], key as ANIM);
            })

            event.push();
        }
    })
}

export type Components = {
    ILightWithId?: ILightWithId<number>,
    BloomFogEnvironment?: BloomFogEnvironment<number>,
    TubeBloomPrePassLight?: TubeBloomPrePassLight<number>
}

export type ILightWithId<T extends number | KeyframesLinear> = {
    lightID: T,
    type: T
}

export type BloomFogEnvironment<T extends number | KeyframesLinear> = {
    attenuation?: T,
    offset?: T,
    startY?: T,
    height?: T
}

export type TubeBloomPrePassLight<T extends number | KeyframesLinear> = {
    colorAlphaMultiplier?: T,
    bloomFogIntensityMultiplier?: T
}