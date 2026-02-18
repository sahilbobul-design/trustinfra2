import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getHealthTrends, getContractorPerformance, getInfrastructureStats } from '@/lib/api';
import { format } from 'date-fns';

interface HealthTrendChartProps {
  infraId?: number;
}

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({ infraId }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        const trends = await getHealthTrends(infraId, 30);
        setData(trends.trends || []);
      } catch (error) {
        console.error('Error loading health trends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrends();
  }, [infraId]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="w-full h-96 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Health Score Trends (30 Days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="_id" stroke="#888" />
          <YAxis stroke="#888" domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #444' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="averageScore"
            stroke="#10b981"
            name="Average Score"
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="minScore"
            stroke="#ef4444"
            name="Min Score"
            dot={{ fill: '#ef4444', r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="maxScore"
            stroke="#3b82f6"
            name="Max Score"
            dot={{ fill: '#3b82f6', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ContractorPerformanceChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerformance = async () => {
      try {
        const result = await getContractorPerformance();
        setData(result.performance || []);
      } catch (error) {
        console.error('Error loading performance:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="w-full h-96 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Contractor Success Rate</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="contractorAddress"
            angle={-45}
            textAnchor="end"
            height={100}
            stroke="#888"
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="#888" domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #444' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Bar dataKey="successRate" fill="#10b981" name="Success Rate (%)" />
          <Bar dataKey="totalClaims" fill="#3b82f6" name="Total Claims" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const InfrastructureStatusChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getInfrastructureStats();
        const chartData = [
          { name: 'Excellent (>80)', value: stats.statusDistribution?.find((s: any) => s._id.healthCategory === 'Excellent')?.count || 0 },
          { name: 'Good (60-80)', value: stats.statusDistribution?.find((s: any) => s._id.healthCategory === 'Good')?.count || 0 },
          { name: 'Fair (40-60)', value: stats.statusDistribution?.find((s: any) => s._id.healthCategory === 'Fair')?.count || 0 },
          { name: 'Poor (<40)', value: stats.statusDistribution?.find((s: any) => s._id.healthCategory === 'Poor')?.count || 0 },
        ];
        setData(chartData);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="w-full h-96 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Infrastructure Health Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #444' }}
            labelStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
