import type { Builder } from './data';
export function matchBuilder(me: Builder, other: Builder) {
 const complementary = other.skills.filter(s=>!me.skills.includes(s));
 const common = other.interests.filter(s=>me.interests.includes(s));
 const overlap = Math.abs(other.hours-me.hours)<=10;
 const time = Math.abs(other.zone-me.zone)<=5;
 const score = Math.min(98,35+(complementary.length?20:0)+common.length*12+(overlap?10:0)+(time?8:0)+(other.mode==='Remote'?5:0));
 return {score,reasons:[...(complementary.length?[`Adds ${complementary.slice(0,2).join(' + ')}`]:['Shared technical foundation']),...(common.length?[`Both interested in ${common.join(' & ')}`]:[]),...(overlap?[`Compatible ${other.hours}h/week commitment`]:[]),...(time?['Time zones within 5 hours']:[])]};
}
