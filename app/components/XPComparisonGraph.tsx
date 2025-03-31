import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface XPGain {
  date: string;
  xp: number;
}

interface PlayerData {
  username: string;
  xpGains: XPGain[];
}

interface XPComparisonGraphProps {
  mainPlayerData: PlayerData;
  comparePlayerData: PlayerData;
}

export default function XPComparisonGraph({
  mainPlayerData,
  comparePlayerData,
}: XPComparisonGraphProps) {
  const [timeRange, setTimeRange] = useState('7d');

  // Filter data based on selected time range
  const filterDataByTimeRange = (data: XPGain[]) => {
    if (!data?.length) return [];
    
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - (
        timeRange === '24h' ? 24 * 60 * 60 * 1000 :
        timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
        timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
        90 * 24 * 60 * 60 * 1000
      ));

      return data.filter(point => {
        try {
          const pointDate = new Date(point.date);
          return !isNaN(pointDate.getTime()) && pointDate >= cutoff;
        } catch (err) {
          console.error('Invalid date in data point:', point);
          return false;
        }
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.error('Error filtering data:', err);
      return [];
    }
  };

  // Calculate XP gain for the selected time range
  const calculateGainForTimeRange = (data: XPGain[]) => {
    if (!data?.length) return 0;
    const filteredData = filterDataByTimeRange(data);
    if (filteredData.length < 2) return 0;
    return filteredData[filteredData.length - 1].xp - filteredData[0].xp;
  };

  const mainPlayerGain = calculateGainForTimeRange(mainPlayerData.xpGains);
  const comparePlayerGain = calculateGainForTimeRange(comparePlayerData.xpGains);
  const gainDifference = comparePlayerGain - mainPlayerGain;

  // Get the label based on time range
  const getGainLabel = () => {
    switch (timeRange) {
      case '24h':
        return '24-Hour';
      case '7d':
        return 'Weekly';
      case '30d':
        return 'Monthly';
      case '90d':
        return '90-Day';
      default:
        return '';
    }
  };

  // Add debug logging
  console.log('Main player data:', mainPlayerData);
  console.log('Compare player data:', comparePlayerData);

  // Validate data structure
  if (!mainPlayerData?.xpGains?.length || !comparePlayerData?.xpGains?.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-blue-400">XP Progression Comparison</h3>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-8 text-center">
          <div className="text-gray-400 mb-2">No XP data available</div>
          <div className="text-sm text-gray-500">
            {!mainPlayerData?.xpGains?.length && !comparePlayerData?.xpGains?.length
              ? "XP history is missing for both players"
              : !mainPlayerData?.xpGains?.length
              ? `XP history is missing for ${mainPlayerData?.username || 'first player'}`
              : `XP history is missing for ${comparePlayerData?.username || 'second player'}`}
          </div>
        </div>
      </div>
    );
  }

  // Validate date format in data
  const validateData = (data: XPGain[]) => {
    return data.filter(point => {
      try {
        const date = new Date(point.date);
        return !isNaN(date.getTime());
      } catch {
        console.error('Invalid date format:', point);
        return false;
      }
    });
  };

  const validMainData = validateData(mainPlayerData.xpGains);
  const validCompareData = validateData(comparePlayerData.xpGains);

  const filteredMainData = filterDataByTimeRange(validMainData);
  const filteredCompareData = filterDataByTimeRange(validCompareData);

  // Add debug logging for filtered data
  console.log('Filtered main data:', filteredMainData);
  console.log('Filtered compare data:', filteredCompareData);

  // Check if filtered data is empty for the selected time range
  if (!filteredMainData.length || !filteredCompareData.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-blue-400">XP Progression Comparison</h3>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#1E293B] text-white text-sm rounded-lg px-3 py-1.5 border border-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-xl p-8 text-center">
          <div className="text-gray-400 mb-2">No data available for selected time range</div>
          <div className="text-sm text-gray-500">
            Try selecting a different time period
          </div>
        </div>
      </div>
    );
  }

  // Combine and format data for Recharts
  const combinedData = filteredMainData.map((point) => {
    const comparePoint = filteredCompareData.find(
      cp => new Date(cp.date).toDateString() === new Date(point.date).toDateString()
    );
    
    return {
      date: new Date(point.date).toLocaleDateString(),
      [mainPlayerData.username]: point.xp,
      [comparePlayerData.username]: comparePoint?.xp || null,
    };
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-medium text-blue-400">XP Progression</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
      <div className="h-[400px] bg-[#0F172A] rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey="date"
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={{ stroke: '#94A3B8' }}
              minTickGap={20}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={{ stroke: '#94A3B8' }}
              tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
              domain={['auto', 'auto']}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#F8FAFC',
                fontSize: '12px',
                padding: '8px'
              }}
              labelStyle={{ color: '#94A3B8', fontSize: '11px' }}
              formatter={(value: number) => [value.toLocaleString(), 'XP']}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '1rem',
                color: '#94A3B8',
                fontSize: '12px'
              }}
            />
            <Line
              type="monotone"
              dataKey={mainPlayerData.username}
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
            <Line
              type="monotone"
              dataKey={comparePlayerData.username}
              stroke="#C084FC"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 