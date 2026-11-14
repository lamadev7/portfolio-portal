import type { SceneModule } from '../types';
import { school } from './school';
import { uniglobe } from './uniglobe';
import { herald } from './herald';
import { princelab } from './princelab';
import { portpro } from './portpro';
import { award2023, award2024 } from './award';
import { graduation } from './graduation';
import { fyp } from './fyp';
import { orchestrator } from './orchestrator';
import { everest } from './everest';

/** one scene per chapter, in story order */
export const CHAPTER_SCENES: SceneModule[] = [school, uniglobe, herald, princelab, portpro, award2023, graduation, award2024, fyp, orchestrator, everest];
export const SCENES = CHAPTER_SCENES;
