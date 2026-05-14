'use client'

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { Download, TrendingUp, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AnalyticsPage() {
  const eventId = 'active-event-id'
  const { leaderboard } = useLeaderboard(eventId)

  // Transform leaderboard for chart
  const chartData = leaderboard.map(team => ({
    name: team.team_name,
    Egg: team.egg_integrity_score,
    Shield: team.shield_integrity_score,
    Innovation: team.innovation_score,
    Efficiency: team.budget_efficiency_score,
    Bonus: team.bonus_points,
  }))

  const totalTeams = leaderboard.length
  const avgScore = totalTeams > 0 
    ? Math.round(leaderboard.reduce((acc, curr) => acc + curr.total_score, 0) / totalTeams) 
    : 0
    
  const highestInnovator = [...leaderboard].sort((a, b) => b.innovation_score - a.innovation_score)[0]
  const mostFrugal = [...leaderboard].sort((a, b) => b.budget_efficiency_score - a.budget_efficiency_score)[0]

  function handleExport() {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Rank,Team,Total,Egg,Shield,Innovation,Efficiency\n"
      + leaderboard.map((e, i) => `${i+1},${e.team_name},${e.total_score},${e.egg_integrity_score},${e.shield_integrity_score},${e.innovation_score},${e.budget_efficiency_score}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "egg_drop_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Debrief</h1>
          <p className="text-muted-foreground text-lg">Post-game insights and measurable L&D outcomes.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Total Score</CardTitle>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore} pts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Innovative</CardTitle>
            <span className="text-2xl">💡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{highestInnovator?.team_name || '--'}</div>
            <p className="text-xs text-muted-foreground">{highestInnovator?.innovation_score || 0} pts for design</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Highest Efficiency</CardTitle>
            <DollarSign className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{mostFrugal?.team_name || '--'}</div>
            <p className="text-xs text-muted-foreground">{mostFrugal?.budget_efficiency_score || 0} pts for frugality</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown by Team</CardTitle>
          <CardDescription>Visualizing how each team accumulated their final points.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="Egg" stackId="a" fill="#10b981" />
                  <Bar dataKey="Shield" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Innovation" stackId="a" fill="#a855f7" />
                  <Bar dataKey="Efficiency" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Bonus" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">
                No scoring data available to chart.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debrief Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Final Debrief Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Egg</TableHead>
                <TableHead className="text-center">Shield</TableHead>
                <TableHead className="text-center">Innovation</TableHead>
                <TableHead className="text-center">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((team, idx) => (
                <TableRow key={team.id}>
                  <TableCell className="pl-6 font-bold">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{team.team_name}</TableCell>
                  <TableCell className="text-center font-bold text-blue-600">{team.total_score}</TableCell>
                  <TableCell className="text-center">{team.egg_integrity_score}</TableCell>
                  <TableCell className="text-center">{team.shield_integrity_score}</TableCell>
                  <TableCell className="text-center">{team.innovation_score}</TableCell>
                  <TableCell className="text-center">{team.budget_efficiency_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
