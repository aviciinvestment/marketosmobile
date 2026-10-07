import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export const Dropdown = ({ theme, options, selected, onSelect, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity 
        style={[styles.dropdownButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '500' }}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={{ color: theme.mutedForeground }}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.dropdownMenu, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt.id} 
              style={[styles.dropdownOption, { borderBottomColor: theme.border }]}
              onPress={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            >
              <Text style={{ color: selected?.id === opt.id ? theme.primary : theme.foreground, fontSize: 16 }}>
                {opt.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  }
});

