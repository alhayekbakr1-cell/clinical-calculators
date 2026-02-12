"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts"

export default function MetricCharts({ data }: { data: any[] }) {
    return (
        <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm border-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex justify-between items-center">
                        Run Chart
                        <span className="bg-advent-blue text-white text-[10px] px-2 py-0.5 rounded italic">Beta</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: any) => [`${(val * 100).toFixed(1)}%`, 'Rate']}
                                />
                                <Legend iconType="circle" />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#005D91"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#005D91', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                    name="Success Rate"
                                    animationDuration={1500}
                                />
                                {/* Reference line for Department Goal or Baseline could be added here */}
                                <ReferenceLine y={0.5} label={{ position: 'right', value: 'Goal (50%)', fill: '#005D91', fontSize: 10, fontWeight: 900 }} stroke="#005D91" strokeDasharray="3 3" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Current Average</span>
                            <span className="text-2xl font-black text-slate-900 leading-none">36.5%</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Last Month</span>
                            <span className="text-2xl font-black text-green-600 leading-none">+12.0%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
